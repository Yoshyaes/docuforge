'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check, Key, FileText, Terminal, X } from 'lucide-react';

interface OnboardingChecklistProps {
  hasApiKey: boolean;
  hasGeneration: boolean;
  apiKeyPreview?: string;
}

const steps = [
  {
    id: 'account',
    label: 'Create your account',
    always: true,
  },
  {
    id: 'api-key',
    label: 'Create an API key',
    href: '/keys',
    cta: 'Create Key',
    icon: Key,
  },
  {
    id: 'first-pdf',
    label: 'Generate your first PDF',
    href: '/playground',
    cta: 'Open Playground',
    icon: FileText,
  },
  {
    id: 'try-api',
    label: 'Try the API directly',
    cta: 'Copy curl',
    icon: Terminal,
  },
] as const;

export function OnboardingChecklist({
  hasApiKey,
  hasGeneration,
  apiKeyPreview,
}: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (dismissed) return null;

  const completedSteps = {
    account: true,
    'api-key': hasApiKey,
    'first-pdf': hasGeneration,
    'try-api': hasGeneration,
  };

  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const allDone = completedCount === 4;

  if (allDone) return null;

  const curlCommand = `curl -X POST https://api.getdocuforge.dev/v1/generate \\
  -H "Authorization: Bearer ${apiKeyPreview || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{"html": "<h1>Hello from DocuForge!</h1>"}'`;

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[15px] font-bold text-text-primary">
            Get started with DocuForge
          </h2>
          <p className="text-xs text-text-dim mt-0.5">
            Generate your first PDF in under 5 minutes
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-text-dim hover:text-text-muted transition-colors p-1"
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-yellow-400 transition-all duration-500"
            style={{ width: `${(completedCount / 4) * 100}%` }}
          />
        </div>
        <span className="text-xs text-text-dim font-medium">
          {completedCount}/4
        </span>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step) => {
          const done = completedSteps[step.id as keyof typeof completedSteps];
          return (
            <div
              key={step.id}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors ${
                done
                  ? 'bg-green-500/5'
                  : 'bg-surface-hover/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    done
                      ? 'bg-green-500/20 text-green-400'
                      : 'border border-border-subtle text-text-dim'
                  }`}
                >
                  {done ? (
                    <Check size={12} strokeWidth={3} />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-text-dim" />
                  )}
                </div>
                <span
                  className={`text-[13px] font-medium ${
                    done ? 'text-text-muted line-through' : 'text-text-primary'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {!done && 'href' in step && step.href && (
                <Link
                  href={step.href}
                  className="text-xs font-semibold text-accent hover:text-orange-400 transition-colors"
                >
                  {step.cta}
                </Link>
              )}
              {!done && step.id === 'try-api' && hasApiKey && (
                <button
                  onClick={handleCopyCurl}
                  className="text-xs font-semibold text-accent hover:text-orange-400 transition-colors"
                >
                  {copied ? 'Copied!' : step.cta}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
