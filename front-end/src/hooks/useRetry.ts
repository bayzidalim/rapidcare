import { useState, useCallback, useRef } from 'react';
import { ErrorInfo, shouldAutoRetry } from '@/lib/errorHandler';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

interface RetryState {
  isRetrying: boolean;
  retryCount: number;
  nextRetryIn: number;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2
};

export function useRetry(config: Partial<RetryConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const [retryState, setRetryState] = useState<RetryState>({
    isRetrying: false,
    retryCount: 0,
    nextRetryIn: 0
  });
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const countdownRef = useRef<NodeJS.Timeout>();

  const calculateDelay = useCallback((retryCount: number): number => {
    const delay = finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, retryCount);
    return Math.min(delay, finalConfig.maxDelay);
  }, [finalConfig]);

  const startCountdown = useCallback((delay: number) => {
    let remaining = Math.ceil(delay / 1000);
    setRetryState(prev => ({ ...prev, nextRetryIn: remaining }));
    
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setRetryState(prev => ({ ...prev, nextRetryIn: remaining }));
      
      if (remaining <= 0) {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
        }
      }
    }, 1000);
  }, []);

  const retry = useCallback(async <T>(
    operation: () => Promise<T>,
    errorInfo?: ErrorInfo
  ): Promise<T> => {
    // Check if we should retry
    if (retryState.retryCount >= finalConfig.maxRetries) {
      throw new Error(`Maximum retry attempts (${finalConfig.maxRetries}) exceeded`);
    }

    // Check if error is retryable
    if (errorInfo && !shouldAutoRetry(errorInfo)) {
      throw new Error('Error is not retryable');
    }

    const currentRetryCount = retryState.retryCount;
    const delay = calculateDelay(currentRetryCount);

    console.log(`🔄 Retry attempt ${currentRetryCount + 1}/${finalConfig.maxRetries} in ${delay}ms`);

    setRetryState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: currentRetryCount + 1
    }));

    // Start countdown
    startCountdown(delay);

    return new Promise((resolve, reject) => {
      timeoutRef.current = setTimeout(async () => {
        try {
          console.log(`🚀 Executing retry attempt ${currentRetryCount + 1}`);
          const result = await operation();
          
          // Success - reset retry state
          setRetryState({
            isRetrying: false,
            retryCount: 0,
            nextRetryIn: 0
          });
          
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
          }
          
          console.log('✅ Retry successful');
          resolve(result);
        } catch (error) {
          setRetryState(prev => ({ ...prev, isRetrying: false, nextRetryIn: 0 }));
          
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
          }
          
          console.error(`❌ Retry attempt ${currentRetryCount + 1} failed:`, error);
          reject(error);
        }
      }, delay);
    });
  }, [retryState.retryCount, finalConfig, calculateDelay, startCountdown]);

  const manualRetry = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T> => {
    console.log('🔄 Manual retry triggered');
    
    setRetryState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1
    }));

    try {
      const result = await operation();
      
      // Success - reset retry state
      setRetryState({
        isRetrying: false,
        retryCount: 0,
        nextRetryIn: 0
      });
      
      console.log('✅ Manual retry successful');
      return result;
    } catch (error) {
      setRetryState(prev => ({ ...prev, isRetrying: false }));
      console.error('❌ Manual retry failed:', error);
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    
    setRetryState({
      isRetrying: false,
      retryCount: 0,
      nextRetryIn: 0
    });
    
    console.log('🔄 Retry state reset');
  }, []);

  const canRetry = retryState.retryCount < finalConfig.maxRetries;

  return {
    retry,
    manualRetry,
    reset,
    retryState,
    canRetry,
    maxRetries: finalConfig.maxRetries
  };
}