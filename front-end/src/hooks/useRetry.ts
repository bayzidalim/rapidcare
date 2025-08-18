import { useState } from 'react';

interface RetryState {
  retryCount: number;
  isRetrying: boolean;
  lastError: Error | null;
}

export function useRetry() {
  const [retryState, setRetryState] = useState<RetryState>({
    retryCount: 0,
    isRetrying: false,
    lastError: null
  });

  const retry = async <T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> => {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setRetryState(prev => ({ 
          ...prev, 
          retryCount: attempt,
          isRetrying: attempt > 0 
        }));
        
        const result = await operation();
        
        setRetryState({
          retryCount: 0,
          isRetrying: false,
          lastError: null
        });
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxRetries) {
          setRetryState(prev => ({
            ...prev,
            isRetrying: false,
            lastError
          }));
          throw lastError;
        }
        
        // Simple delay between retries
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    
    throw lastError!;
  };

  const reset = () => {
    setRetryState({
      retryCount: 0,
      isRetrying: false,
      lastError: null
    });
  };

  return {
    ...retryState,
    retry,
    reset
  };
}