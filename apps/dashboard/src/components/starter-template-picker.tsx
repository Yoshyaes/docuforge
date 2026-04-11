'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface StarterTemplate {
  slug: string;
  name: string;
  description: string;
  category: string;
}

const CATEGORY_ICON: Record<string, string> = {
  finance: '$',
  business: '#',
  legal: '§',
  marketing: '~',
};

export function StarterTemplatePicker() {
  const [templates, setTemplates] = useState<StarterTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/starter-templates')
      .then((r) => r.json())
      .then((data) => setTemplates((data.data || []).slice(0, 6)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mb-6 rounded-xl border border-border bg-surface p-5 text-xs text-text-dim">
        Loading starter templates…
      </div>
    );
  }

  if (templates.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-5">
      <div className="mb-3">
        <h2 className="text-[15px] font-bold text-text-primary">Start from a template</h2>
        <p className="text-xs text-text-dim mt-0.5">
          One-click starter. Picks load in the playground, ready to render.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {templates.map((t) => (
          <Link
            key={t.slug}
            href={`/playground?template=${encodeURIComponent(t.slug)}&autorun=1`}
            className="group rounded-lg border border-border-subtle bg-surface-hover/40 p-3 hover:border-accent/60 transition-colors"
          >
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-md bg-accent/15 text-accent flex items-center justify-center font-mono text-sm font-bold">
                {CATEGORY_ICON[t.category] || '•'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-text-primary truncate">
                  {t.name}
                </div>
                <div className="text-[11px] text-text-dim line-clamp-2 mt-0.5">
                  {t.description}
                </div>
              </div>
            </div>
            <div className="text-[11px] text-accent font-semibold mt-2 group-hover:text-orange-400">
              Try it →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
