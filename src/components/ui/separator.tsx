import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

export function Separator({ orientation = 'horizontal', className, ...props }: SeparatorProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        orientation === 'vertical' ? 'separator-v' : 'separator-h',
        className,
      )}
      {...props}
    />
  );
}
