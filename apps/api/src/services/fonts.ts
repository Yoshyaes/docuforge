import { db } from '../lib/db.js';
import { customFonts } from '../schema/db.js';
import { eq, and } from 'drizzle-orm';
import { fontId } from '../lib/id.js';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';

const ALLOWED_FORMATS = ['woff2', 'ttf', 'otf'] as const;
const MAX_FONT_SIZE = 5 * 1024 * 1024; // 5MB

const FORMAT_TO_CSS: Record<string, string> = {
  woff2: 'woff2',
  ttf: 'truetype',
  otf: 'opentype',
};

const FAMILY_PATTERN = /^[A-Za-z0-9 _-]{1,64}$/;

/**
 * Detect font format from the file's magic header bytes. MIME type and
 * filename extension are advisory only — they're trivially spoofable.
 *
 * Magic numbers per spec:
 *   WOFF2: 'wOF2'         (77 4F 46 32)
 *   WOFF:  'wOFF'         (77 4F 46 46)  — not currently allowed
 *   OTF:   'OTTO'         (4F 54 54 4F)
 *   TTF:   0x00010000     or 'true'      (74 72 75 65)
 */
function detectFormatFromMagic(buf: Buffer): (typeof ALLOWED_FORMATS)[number] | null {
  if (buf.length < 4) return null;
  const head = buf.subarray(0, 4);

  if (head.equals(Buffer.from('wOF2'))) return 'woff2';
  if (head.equals(Buffer.from('OTTO'))) return 'otf';
  if (head.equals(Buffer.from('true'))) return 'ttf';
  if (
    head[0] === 0x00 &&
    head[1] === 0x01 &&
    head[2] === 0x00 &&
    head[3] === 0x00
  ) {
    return 'ttf';
  }
  // 'typ1' is another legit TTF marker
  if (head.equals(Buffer.from('typ1'))) return 'ttf';

  return null;
}

/**
 * Escape arbitrary text for safe interpolation inside a single-quoted
 * CSS string. CSS allows \HH hex escapes for any non-ASCII / unsafe
 * character. We only allow chars from FAMILY_PATTERN through, so this
 * is belt-and-braces: even with the regex gate, anything outside
 * [A-Za-z0-9 _-] gets neutralised.
 */
function escapeCssString(value: string): string {
  return value.replace(/[^A-Za-z0-9 _-]/g, (ch) => {
    const code = ch.charCodeAt(0).toString(16);
    return `\\${code} `;
  });
}

export async function uploadFont(
  userId: string,
  fileBuffer: Buffer,
  filename: string,
  // mimeType retained for back-compat but no longer trusted — we sniff
  // the magic bytes instead.
  _mimeType: string,
  family: string,
): Promise<{ id: string; name: string; family: string; format: string }> {
  if (fileBuffer.length > MAX_FONT_SIZE) {
    throw new Error('Font file exceeds 5MB limit');
  }

  // Validate the family name *before* doing any I/O. Rejects:
  //   x'; } body{display:none} @font-face{font-family:'y
  //   ../../etc/passwd
  //   anything with quotes, newlines, semicolons, or angle brackets.
  if (typeof family !== 'string' || !FAMILY_PATTERN.test(family)) {
    throw new Error(
      'Invalid font family. Use only letters, numbers, spaces, underscores, and hyphens (max 64 chars).',
    );
  }

  // Verify the file's actual format from magic bytes — never trust the
  // MIME type or extension the client sent. A .ttf-named PE/ELF/zip
  // would have been accepted before this check.
  const format = detectFormatFromMagic(fileBuffer);
  if (!format) {
    throw new Error('Unsupported font format. Magic bytes did not match WOFF2, TTF, or OTF.');
  }

  // Sanitize the display filename — we store it for the listing UI but
  // never use it on disk (storage path is built from id+format).
  const safeName = filename
    .replace(/[\0\r\n]/g, '')
    .replace(/[^A-Za-z0-9._\-() ]/g, '_')
    .slice(0, 255);

  const id = fontId();
  const storageKey = `fonts/${userId}/${id}.${format}`;

  // Store the font file
  const provider = process.env.STORAGE_PROVIDER || 'local';

  if (provider === 'local') {
    const dir = join(process.cwd(), '.storage', 'fonts', userId);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `${id}.${format}`), fileBuffer);
  } else {
    // Use S3-compatible storage (same pattern as storage.ts).
    // Derive content-type from the verified format rather than echoing
    // the (untrusted) client MIME, so we never serve a non-font payload
    // with a font Content-Type by accident.
    const contentType =
      format === 'woff2' ? 'font/woff2' : format === 'otf' ? 'font/otf' : 'font/ttf';
    const { uploadFontToS3 } = await getS3Uploader();
    await uploadFontToS3(storageKey, fileBuffer, contentType);
  }

  // Save metadata to DB
  const [record] = await db
    .insert(customFonts)
    .values({
      id,
      userId,
      name: safeName,
      family,
      format,
      storageKey,
      fileSizeBytes: fileBuffer.length,
    })
    .returning();

  return { id: record.id, name: record.name, family: record.family, format: record.format };
}

async function getS3Uploader() {
  const provider = process.env.STORAGE_PROVIDER || 'local';
  let client: S3Client;
  let bucket: string;

  if (provider === 'r2') {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
    bucket = process.env.R2_BUCKET_NAME || 'docuforge-pdfs';
  } else if (provider === 's3') {
    client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    bucket = process.env.S3_BUCKET_NAME || 'docuforge-pdfs';
  } else {
    client = new S3Client({
      region: 'auto',
      endpoint: process.env.GCS_ENDPOINT || 'https://storage.googleapis.com',
      credentials: {
        accessKeyId: process.env.GOOGLE_ACCESS_KEY_ID!,
        secretAccessKey: process.env.GOOGLE_SECRET_ACCESS_KEY!,
      },
    });
    bucket = process.env.GCS_BUCKET_NAME || 'docuforge-pdfs';
  }

  return {
    uploadFontToS3: async (key: string, body: Buffer, contentType: string) => {
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000',
      }));
    },
    deleteFontFromS3: async (key: string) => {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}

export async function getUserFonts(userId: string) {
  return db
    .select({
      id: customFonts.id,
      name: customFonts.name,
      family: customFonts.family,
      format: customFonts.format,
      fileSizeBytes: customFonts.fileSizeBytes,
      createdAt: customFonts.createdAt,
    })
    .from(customFonts)
    .where(eq(customFonts.userId, userId));
}

export async function deleteFont(userId: string, id: string): Promise<boolean> {
  const [font] = await db
    .select()
    .from(customFonts)
    .where(and(eq(customFonts.id, id), eq(customFonts.userId, userId)))
    .limit(1);

  if (!font) return false;

  const provider = process.env.STORAGE_PROVIDER || 'local';

  if (provider === 'local') {
    try {
      await unlink(join(process.cwd(), '.storage', 'fonts', userId, `${id}.${font.format}`));
    } catch { /* file may not exist */ }
  } else {
    const { deleteFontFromS3 } = await getS3Uploader();
    await deleteFontFromS3(font.storageKey);
  }

  await db.delete(customFonts).where(eq(customFonts.id, id));
  return true;
}

export async function getFontCssForUser(userId: string): Promise<string> {
  const fonts = await db
    .select()
    .from(customFonts)
    .where(eq(customFonts.userId, userId));

  if (fonts.length === 0) return '';

  const provider = process.env.STORAGE_PROVIDER || 'local';
  const baseUrl =
    provider === 'r2' ? process.env.R2_PUBLIC_URL :
    provider === 's3' ? process.env.S3_PUBLIC_URL :
    provider === 'gcs' ? process.env.GCS_PUBLIC_URL :
    `http://localhost:${process.env.PORT || 3000}/files`;

  const declarations = fonts.map((font) => {
    const cssFormat = FORMAT_TO_CSS[font.format] || 'truetype';
    const url = provider === 'local'
      ? `http://localhost:${process.env.PORT || 3000}/fonts/${font.userId}/${font.id}.${font.format}`
      : `${baseUrl}/${font.storageKey}`;

    // family was gated by FAMILY_PATTERN on upload, but escape again
    // before interpolating in case the DB row predates the regex.
    const safeFamily = escapeCssString(font.family);

    return `@font-face {
  font-family: '${safeFamily}';
  src: url('${encodeURI(url)}') format('${cssFormat}');
  font-display: swap;
}`;
  });

  return declarations.join('\n');
}
