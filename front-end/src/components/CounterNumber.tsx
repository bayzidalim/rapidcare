'use client';

import { useCounter } from '@/hooks/useCounter';

interface CounterNumberProps {
  end: number;
  start?: number;
  duration?: number;
  delay?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  className?: string;
}

export function CounterNumber({
  end,
  start = 0,
  duration = 2000,
  delay = 0,
  suffix = '',
  prefix = '',
  decimals = 0,
  className = ''
}: CounterNumberProps) {
  const { count, elementRef } = useCounter({
    end,
    start,
    duration,
    delay,
    suffix,
    prefix,
    decimals
  });

  return (
    <div ref={elementRef} className={className}>
      {count}
    </div>
  );
}
