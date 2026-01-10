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
        'inline-block bg-[length:300%_300%] bg-clip-text text-transparent animate-shadanim',
        'bg-[linear-gradient(115deg,transparent_25%,hsl(var(--primary))_50%,transparent_75%,transparent_100%),linear-gradient(hsl(var(--foreground)),hsl(var(--foreground)))]',
        className
      )}
      {...props}
    >
      {text}
    </span>
  );
}
