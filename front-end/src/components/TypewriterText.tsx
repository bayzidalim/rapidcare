'use client';

import { useTypewriter } from '@/hooks/useTypewriter';

interface TypewriterTextProps {
  texts: string[];
  speed?: number;
  delay?: number;
  loop?: boolean;
  pauseTime?: number;
  className?: string;
  cursor?: boolean;
  cursorBlink?: boolean;
  triggerOnHover?: boolean;
}

export function TypewriterText({
  texts,
  speed = 100,
  delay = 0,
  loop = true,
  pauseTime = 2000,
  className = '',
  cursor = true,
  cursorBlink = true,
  triggerOnHover = false
}: TypewriterTextProps) {
  const { currentText, handleMouseEnter, handleMouseLeave, isAnimating } = useTypewriter(texts, {
    speed,
    delay,
    loop,
    pauseTime,
    triggerOnHover
  });

  return (
    <span 
      className={`${className} ${triggerOnHover ? 'cursor-pointer transition-colors duration-200 hover:text-blue-600' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {currentText}
      {cursor && (isAnimating || !triggerOnHover) && (
        <span 
          className={`inline-block w-0.5 h-[1em] bg-current ml-1 ${
            cursorBlink ? 'animate-pulse' : ''
          }`}
        />
      )}
    </span>
  );
}
