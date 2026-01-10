import React from 'react';
import { cn } from '@/lib/utils';

export function PatternText({
  text = 'Text',
  className,
  ...props
}: Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> & { text: string }) {
  return (
    <span
      className={cn(
        'inline-block font-bold pattern-text-shimmer',
        className
      )}
      {...props}
    >
      {text}
    </span>
  );
}
