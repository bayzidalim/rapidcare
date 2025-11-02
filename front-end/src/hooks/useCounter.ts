'use client';

import { useEffect, useState, useRef } from 'react';

interface CounterOptions {
  duration?: number;
  start?: number;
  end: number;
  delay?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}

export function useCounter(options: CounterOptions) {
  const {
    duration = 2000,
    start = 0,
    end,
    delay = 0,
    suffix = '',
    prefix = '',
    decimals = 0
  } = options;

  const [count, setCount] = useState(start);
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const startTime = Date.now() + delay;
    const startValue = start;
    const endValue = end;
    const totalDuration = duration;

    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;

      if (elapsed < 0) {
        requestAnimationFrame(animate);
        return;
      }

      const progress = Math.min(elapsed / totalDuration, 1);
      
      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = startValue + (endValue - startValue) * easeOutCubic;
      
      setCount(Number(currentValue.toFixed(decimals)));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, start, end, duration, delay, decimals]);

  const formatCount = (value: number) => {
    return `${prefix}${value.toLocaleString()}${suffix}`;
  };

  return {
    count: formatCount(count),
    elementRef,
    isVisible
  };
}
