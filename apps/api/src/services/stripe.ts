import Stripe from 'stripe';
import { db } from '../lib/db.js';
import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { users, stripeCustomers, stripeSubscriptions } from '../schema/db.js';
import { eq } from 'drizzle-orm';

// Stripe retries an event for up to 3 days. Cache event IDs for 7 days
// so a delayed retry can't double-process. The cache lives in Redis so
// it survives restarts.
const EVENT_DEDUP_TTL_SECONDS = 60 * 60 * 24 * 7;

/**
 * Returns true the first time a given event.id is seen; false on every
 * subsequent call within EVENT_DEDUP_TTL_SECONDS. Exported so tests can
 * exercise it directly.
 */
export async function markEventProcessed(eventId: string): Promise<boolean> {
  // SET NX returns 'OK' on success, null on already-set. We treat the
  // 'already exists' case as a duplicate retry and skip processing.
  const result = await redis.set(
    `stripe:event:${eventId}`,
    '1',
    'EX',
    EVENT_DEDUP_TTL_SECONDS,
    'NX',
  );
  return result === 'OK';
}

/** Resolve a Stripe price-id to a plan name. Exported for testing. */
export function planForPriceId(priceId: string | undefined): string | null {
  if (!priceId) return null;
  return PRICE_PLAN_MAP[priceId] ?? null;
}

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Plan-to-Stripe price mapping (configure these in your Stripe dashboard)
const PLAN_PRICE_MAP: Record<string, string> = {
  starter: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter',
  pro: process.env.STRIPE_PRO_PRICE_ID || 'price_pro',
};

const PRICE_PLAN_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(PLAN_PRICE_MAP).map(([plan, priceId]) => [priceId, plan]),
);

function getStripe(): Stripe {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-01-27.acacia' as any });
}

export function isStripeConfigured(): boolean {
  return !!STRIPE_SECRET_KEY;
}

export async function getOrCreateCustomer(
  userId: string,
  email: string,
): Promise<string> {
  // Check if customer already exists
  const [existing] = await db
    .select()
    .from(stripeCustomers)
    .where(eq(stripeCustomers.userId, userId))
    .limit(1);

  if (existing) return existing.stripeCustomerId;

  // Create in Stripe
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  // Save to DB
  await db.insert(stripeCustomers).values({
    userId,
    stripeCustomerId: customer.id,
  });

  return customer.id;
}

export async function createCheckoutSession(
  userId: string,
  email: string,
  plan: 'starter' | 'pro',
): Promise<string> {
  const stripe = getStripe();
  const customerId = await getOrCreateCustomer(userId, email);
  const priceId = PLAN_PRICE_MAP[plan];

  if (!priceId) {
    throw new Error(`No Stripe price configured for plan: ${plan}`);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.DASHBOARD_URL || 'http://localhost:3001'}/settings?billing=success`,
    cancel_url: `${process.env.DASHBOARD_URL || 'http://localhost:3001'}/settings?billing=canceled`,
    metadata: { userId, plan },
  });

  return session.url!;
}

export async function createPortalSession(
  userId: string,
): Promise<string> {
  const stripe = getStripe();

  const [customer] = await db
    .select()
    .from(stripeCustomers)
    .where(eq(stripeCustomers.userId, userId))
    .limit(1);

  if (!customer) {
    throw new Error('No Stripe customer found for this user');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.stripeCustomerId,
    return_url: `${process.env.DASHBOARD_URL || 'http://localhost:3001'}/settings`,
  });

  return session.url;
}

export async function getSubscription(userId: string) {
  const [sub] = await db
    .select()
    .from(stripeSubscriptions)
    .where(eq(stripeSubscriptions.userId, userId))
    .limit(1);

  return sub || null;
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
): Stripe.Event {
  const stripe = getStripe();
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }
  return stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
}

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  // Idempotency: refuse to process the same event.id twice. Stripe
  // retries on any non-2xx and on timeouts; without dedup, double
  // retries could flip a user's plan twice or double-charge usage.
  const firstSeen = await markEventProcessed(event.id);
  if (!firstSeen) {
    logger.info({ eventId: event.id, type: event.type }, 'Stripe event already processed; skipping');
    return;
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId) break;

      // Fetch the subscription outside the transaction (network call).
      // The PLAN is derived from the actual price ID on the
      // subscription, NOT from session.metadata.plan (which is
      // client-controlled and trusting it lets an attacker pay
      // starter price for pro features by tampering with the
      // checkout-session creation payload).
      let stripeSub: Stripe.Subscription | null = null;
      let resolvedPlan: string | null = null;
      if (session.subscription) {
        const stripe = getStripe();
        stripeSub = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = stripeSub.items.data[0]?.price.id;
        resolvedPlan = priceId ? PRICE_PLAN_MAP[priceId] ?? null : null;
      }
      if (!resolvedPlan) {
        logger.warn(
          { eventId: event.id, userId, sessionId: session.id },
          'checkout.session.completed: no subscription/price → no plan resolved; skipping',
        );
        break;
      }

      // Defense-in-depth: warn if the client-declared plan disagrees
      // with the server-resolved plan (the price-id is authoritative).
      if (session.metadata?.plan && session.metadata.plan !== resolvedPlan) {
        logger.warn(
          {
            eventId: event.id,
            declaredPlan: session.metadata.plan,
            resolvedPlan,
          },
          'Stripe checkout: metadata.plan disagrees with resolved plan; using resolved plan',
        );
      }

      // Apply plan + subscription record atomically so a crash between
      // the two writes can't leave the user upgraded but the
      // subscription unrecorded (or vice versa).
      await db.transaction(async (tx) => {
        await tx
          .update(users)
          .set({ plan: resolvedPlan as any })
          .where(eq(users.id, userId));

        if (stripeSub) {
          await tx
            .insert(stripeSubscriptions)
            .values({
              userId,
              stripeSubscriptionId: stripeSub.id,
              stripePriceId: stripeSub.items.data[0]?.price.id || '',
              status: stripeSub.status,
              currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
              currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
              cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
            })
            .onConflictDoUpdate({
              target: stripeSubscriptions.stripeSubscriptionId,
              set: {
                status: stripeSub.status,
                stripePriceId: stripeSub.items.data[0]?.price.id || '',
                currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
                currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
                cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
                updatedAt: new Date(),
              },
            });
        }
      });
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0]?.price.id;
      const newPlan = PRICE_PLAN_MAP[priceId] || null;

      await db.transaction(async (tx) => {
        await tx
          .update(stripeSubscriptions)
          .set({
            status: sub.status,
            stripePriceId: priceId,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            updatedAt: new Date(),
          })
          .where(eq(stripeSubscriptions.stripeSubscriptionId, sub.id));

        if (newPlan) {
          const [subRecord] = await tx
            .select()
            .from(stripeSubscriptions)
            .where(eq(stripeSubscriptions.stripeSubscriptionId, sub.id))
            .limit(1);

          if (subRecord) {
            await tx
              .update(users)
              .set({ plan: newPlan as any })
              .where(eq(users.id, subRecord.userId));
          }
        }
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;

      await db.transaction(async (tx) => {
        await tx
          .update(stripeSubscriptions)
          .set({ status: 'canceled', updatedAt: new Date() })
          .where(eq(stripeSubscriptions.stripeSubscriptionId, sub.id));

        const [subRecord] = await tx
          .select()
          .from(stripeSubscriptions)
          .where(eq(stripeSubscriptions.stripeSubscriptionId, sub.id))
          .limit(1);

        if (subRecord) {
          await tx
            .update(users)
            .set({ plan: 'free' })
            .where(eq(users.id, subRecord.userId));
        }
      });
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        await db
          .update(stripeSubscriptions)
          .set({ status: 'past_due', updatedAt: new Date() })
          .where(eq(stripeSubscriptions.stripeSubscriptionId, invoice.subscription as string));
      }
      break;
    }
  }
}
