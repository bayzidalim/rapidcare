'use client';

import { useEffect, useState, useRef } from 'react';

interface TypewriterOptions {
  speed?: number;
  delay?: number;
  loop?: boolean;
  pauseTime?: number;
  triggerOnHover?: boolean;
}

export function useTypewriter(
  texts: string[],
  options: TypewriterOptions = {}
) {
  const {
    speed = 100,
    delay = 0,
    loop = true,
    pauseTime = 2000,
    triggerOnHover = false
  } = options;

  const [currentText, setCurrentText] = useState(triggerOnHover ? (texts[0] || '') : '');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset animation when hover ends
  useEffect(() => {
    if (triggerOnHover && !isHovered && isAnimating) {
      // Clear any running timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // Reset to first text
      setCurrentText(texts[0] || '');
      setCurrentIndex(0);
      setIsDeleting(false);
      setIsPaused(false);
      setIsAnimating(false);
    }
  }, [isHovered, triggerOnHover, texts, isAnimating]);

  useEffect(() => {
    if (texts.length === 0) return;
    
    // If triggerOnHover is true, only animate when hovered
    if (triggerOnHover && !isHovered) {
      return;
    }

    // Start animation if hovered (for hover mode) or always (for auto mode)
    if (triggerOnHover && isHovered && !isAnimating) {
      setIsAnimating(true);
      setCurrentText('');
      setCurrentIndex(0);
      setIsDeleting(false);
      setIsPaused(false);
    }

    const timeout = setTimeout(() => {
      if (isPaused) {
        setIsPaused(false);
        return;
      }

      const fullText = texts[currentIndex];
      
      if (isDeleting) {
        // Delete word by word instead of character by character
        const words = currentText.split(' ');
        if (words.length > 1) {
          setCurrentText(words.slice(0, -1).join(' '));
        } else {
          setCurrentText('');
        }
        
        if (currentText === '') {
          setIsDeleting(false);
          setCurrentIndex((prev) => (prev + 1) % texts.length);
        }
      } else {
        // Add word by word instead of character by character
        const words = fullText.split(' ');
        const currentWords = currentText.split(' ').filter(word => word.length > 0);
        
        if (currentWords.length < words.length) {
          const nextWord = words[currentWords.length];
          setCurrentText(currentWords.length === 0 ? nextWord : currentText + ' ' + nextWord);
        }
        
        if (currentText === fullText) {
          setIsPaused(true);
          setTimeout(() => {
            if (loop || currentIndex < texts.length - 1) {
              setIsDeleting(true);
            }
          }, pauseTime);
        }
      }
    }, isDeleting ? speed * 2 : speed * 3);

    timeoutRef.current = timeout;
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [currentText, currentIndex, isDeleting, isPaused, texts, speed, pauseTime, loop, triggerOnHover, isHovered, isAnimating]);

  const handleMouseEnter = () => {
    if (triggerOnHover) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (triggerOnHover) {
      setIsHovered(false);
    }
  };

  return {
    currentText,
    handleMouseEnter,
    handleMouseLeave,
    isAnimating: triggerOnHover ? isAnimating : true
  };
}
