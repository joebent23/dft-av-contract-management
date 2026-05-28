import * as React from 'react';
import { cn } from '@/lib/cn';

type Tone = 'info' | 'success' | 'warning' | 'destructive';

const toneClass: Record<Tone, string> = {
  info: 'border-blue-300 bg-blue-50 text-blue-900',
  success: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-300 bg-amber-50 text-amber-900',
  destructive: 'border-red-300 bg-red-50 text-red-900',
};

export interface CalloutProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  title?: string;
}

export function Callout({ tone = 'info', title, className, children, ...rest }: CalloutProps) {
  return (
    <div className={cn('rounded-md border p-3 text-sm', toneClass[tone], className)} {...rest}>
      {title ? <div className="font-medium mb-1">{title}</div> : null}
      <div>{children}</div>
    </div>
  );
}
