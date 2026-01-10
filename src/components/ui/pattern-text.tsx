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
        'bg-[linear-gradient(115deg,transparent_20%,hsl(220_60%_40%)_50%,transparent_80%,transparent_100%),linear-gradient(hsl(220_50%_20%),hsl(220_50%_20%))]',
        'dark:bg-[linear-gradient(115deg,transparent_20%,hsl(220_70%_70%)_50%,transparent_80%,transparent_100%),linear-gradient(hsl(220_40%_85%),hsl(220_40%_85%))]',
        className
      )}
      {...props}
    >
      {text}
    </span>
  );
}
