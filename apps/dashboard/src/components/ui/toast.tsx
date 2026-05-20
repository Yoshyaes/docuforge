'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  notify: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 5_000;

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = nextId++;
      setItems((prev) => [...prev, { id, message, variant }]);
      const timer = setTimeout(() => dismiss(id), TOAST_DURATION_MS);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
      timers.current.clear();
    };
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none"
      >
        {items.map((t) => (
          <ToastView key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const ringClass =
    item.variant === 'success'
      ? 'border-green/40'
      : item.variant === 'error'
        ? 'border-red/40'
        : 'border-border';
  const Icon = item.variant === 'error' ? AlertTriangle : CheckCircle2;
  const iconClass =
    item.variant === 'error'
      ? 'text-red'
      : item.variant === 'success'
        ? 'text-green'
        : 'text-accent';

  return (
    <div
      role={item.variant === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg bg-surface border ${ringClass} shadow-lg text-sm text-text-primary`}
    >
      <Icon size={18} className={`flex-shrink-0 mt-0.5 ${iconClass}`} aria-hidden="true" />
      <div className="flex-1 leading-snug">{item.message}</div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="text-text-muted hover:text-text-primary transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return {
    success: (message: string) => ctx.notify(message, 'success'),
    error: (message: string) => ctx.notify(message, 'error'),
    info: (message: string) => ctx.notify(message, 'info'),
  };
}
