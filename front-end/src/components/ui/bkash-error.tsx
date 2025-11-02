'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, X, Info } from 'lucide-react';
import { Button } from './button';
import { Alert, AlertDescription } from './alert';
import { useRouter } from 'next/navigation';

interface BkashErrorProps {
  error: {
    title: string;
    message: string;
    suggestion?: string;
    code?: string;
    type: 'error' | 'warning' | 'validation' | 'network' | 'critical';
    retryable?: boolean;
    canRetry?: boolean;
    retryAfter?: number;
    nextRetryMessage?: string;
  };
  onRetry?: () => void;
  onReset?: () => void;
  language?: 'bn' | 'en';
}

export default function BkashError({ 
  error, 
  onRetry, 
  onReset,
  language = 'en'
}: BkashErrorProps) {
  const router = useRouter();
  const [retryCountdown, setRetryCountdown] = React.useState<number>(0);

  React.useEffect(() => {
    if (error.canRetry && error.retryAfter && error.retryAfter > 0) {
      setRetryCountdown(Math.ceil(error.retryAfter / 1000));
      
      const interval = setInterval(() => {
        setRetryCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [error.canRetry, error.retryAfter]);

  const getErrorIcon = () => {
    switch (error.type) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'error':
        return <X className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'network':
        return <RefreshCw className="h-5 w-5 text-blue-500" />;
      case 'validation':
        return <Info className="h-5 w-5 text-orange-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
  };

  const getErrorColor = () => {
    switch (error.type) {
      case 'critical':
        return 'border-red-600 bg-red-50';
      case 'error':
        return 'border-red-500 bg-red-50';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50';
      case 'network':
        return 'border-blue-500 bg-blue-50';
      case 'validation':
        return 'border-orange-500 bg-orange-50';
      default:
        return 'border-red-500 bg-red-50';
    }
  };

  const getBkashButtonStyle = () => {
    return 'bg-[#E2136E] hover:bg-[#C91159] text-white font-medium px-6 py-2 rounded-md transition-colors duration-200';
  };

  const getSecondaryButtonStyle = () => {
    return 'bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-2 rounded-md transition-colors duration-200';
  };

  // Replace window.location.reload() with router.refresh()
  const handleRefreshPage = () => {
    router.refresh();
  };

  return (
    <Alert className={`${getErrorColor()} border-l-4`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getErrorIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              {error.title}
            </h3>
            {onReset && (
              <button
                onClick={onReset}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={language === 'bn' ? 'বন্ধ করুন' : 'Close'}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <AlertDescription className="mt-1 text-sm text-gray-700">
            {error.message}
          </AlertDescription>

          {error.suggestion && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-800">
                <strong>{language === 'bn' ? 'পরামর্শ:' : 'Suggestion:'}</strong> {error.suggestion}
              </p>
            </div>
          )}

          {error.code && (
            <p className="mt-2 text-xs text-gray-500">
              {language === 'bn' ? 'ত্রুটি কোড:' : 'Error Code:'} {error.code}
            </p>
          )}

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            {error.canRetry && onRetry && (
              <Button
                onClick={onRetry}
                disabled={retryCountdown > 0}
                className={getBkashButtonStyle()}
              >
                {retryCountdown > 0 ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {language === 'bn' 
                      ? `${retryCountdown} সেকেন্ড পর আবার চেষ্টা করুন`
                      : `Retry in ${retryCountdown}s`
                    }
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {language === 'bn' ? 'আবার চেষ্টা করুন' : 'Try Again'}
                  </>
                )}
              </Button>
            )}

            {error.retryable && !error.canRetry && onRetry && (
              <Button
                onClick={onRetry}
                className={getBkashButtonStyle()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {language === 'bn' ? 'আবার চেষ্টা করুন' : 'Try Again'}
              </Button>
            )}

            <Button
              onClick={handleRefreshPage}
              variant="outline"
              className={getSecondaryButtonStyle()}
            >
              {language === 'bn' ? 'পেজ রিফ্রেশ করুন' : 'Refresh Page'}
            </Button>
          </div>

          {error.nextRetryMessage && retryCountdown === 0 && (
            <p className="mt-2 text-xs text-gray-600">
              {error.nextRetryMessage}
            </p>
          )}
        </div>
      </div>
    </Alert>
  );
};
