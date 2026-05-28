import * as React from 'react';
import { cn } from '@/lib/cn';

export type ToastTone = 'info' | 'success' | 'warning' | 'destructive';

export interface ToastItem {
  id: string;
  title?: string;
  message: string;
  tone?: ToastTone;
  durationMs?: number;
}

interface ToastContextValue {
  toast: (t: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const toneClass: Record<ToastTone, string> = {
  info: 'border-blue-300 bg-blue-50 text-blue-900',
  success: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-300 bg-amber-50 text-amber-900',
  destructive: 'border-red-300 bg-red-50 text-red-900',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const remove = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const toast = React.useCallback(
    (t: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).slice(2);
      const item: ToastItem = { id, durationMs: 5000, tone: 'info', ...t };
      setItems((prev) => [...prev, item]);
      const ms = item.durationMs ?? 5000;
      if (ms > 0) window.setTimeout(() => remove(id), ms);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
        {items.map((i) => (
          <div
            key={i.id}
            className={cn('rounded-md border p-3 shadow-sm text-sm', toneClass[i.tone ?? 'info'])}
            role="status"
          >
            {i.title ? <div className="font-medium mb-0.5">{i.title}</div> : null}
            <div>{i.message}</div>
            <button
              type="button"
              className="absolute opacity-0"
              onClick={() => remove(i.id)}
              aria-label="dismiss"
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
