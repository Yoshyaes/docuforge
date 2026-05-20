'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  /** Optional footer (e.g. action buttons). Rendered below children. */
  footer?: ReactNode;
  /** When true, the dialog cannot be closed by backdrop click or Esc. */
  blocking?: boolean;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Accessible modal dialog with focus trap, Esc-to-close, backdrop
 * dismissal, and focus return on close. Replaces ad-hoc styled-div
 * modals that lacked role="dialog", aria-modal, focus management, and
 * keyboard support.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  blocking,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  const handleClose = useCallback(() => {
    if (!blocking) onClose();
  }, [blocking, onClose]);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const focusFirst = () => {
      const root = dialogRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const target = focusable[0] ?? root;
      target.focus();
    };
    // Give React time to commit the DOM before focusing.
    const focusTimer = setTimeout(focusFirst, 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleClose();
        return;
      }
      if (e.key === 'Tab') {
        const root = dialogRef.current;
        if (!root) return;
        const focusable = Array.from(
          root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        );
        if (focusable.length === 0) {
          e.preventDefault();
          root.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);

    // Lock body scroll while modal is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open, handleClose]);

  if (!open || typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onMouseDown={(e) => {
        // Only close when the backdrop itself (not a child) is clicked.
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className="w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl outline-none"
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border-subtle">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-text-primary">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm text-text-muted">
                {description}
              </p>
            ) : null}
          </div>
          {!blocking && (
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close dialog"
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
        {children ? <div className="p-5 text-sm text-text-primary">{children}</div> : null}
        {footer ? (
          <div className="flex items-center justify-end gap-2 p-4 border-t border-border-subtle bg-surface-hover/50 rounded-b-xl">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Convenience wrapper for the common "are you sure?" pattern. The
 * action is treated as destructive — the confirm button uses the red
 * accent to make the consequence visible.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-3 py-1.5 rounded-md text-sm font-medium text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
              destructive
                ? 'bg-red hover:bg-red/90'
                : 'bg-accent hover:bg-accent/90'
            }`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    />
  );
}
