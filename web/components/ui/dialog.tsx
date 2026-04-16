'use client';

import { useEffect, useRef } from 'react';
import { cn } from '../../lib/cn';
import { Button } from './button';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'destructive';
  onConfirm?: () => void;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  onConfirm,
  children,
  size = 'sm',
}: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

      {/* Panel */}
      <div
        className={cn(
          'relative z-10 w-full rounded-xl border border-border bg-surface-overlay shadow-2xl',
          sizeClasses[size],
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 pb-4">
          <div>
            <h2 id="dialog-title" className="text-[15px] font-semibold text-foreground leading-snug">{title}</h2>
            {description && (
              <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-raised hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        {children && (
          <div className="px-5 pb-4 text-[13px] text-foreground">
            {children}
          </div>
        )}

        {/* Footer */}
        {onConfirm && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              variant={confirmVariant === 'destructive' ? 'destructive' : 'primary'}
              size="sm"
              onClick={() => { onConfirm(); onClose(); }}
            >
              {confirmLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
