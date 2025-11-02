import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertTriangle, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Info,
  Wifi,
  Server,
  CreditCard,
  Hospital,
  AlertCircle
} from 'lucide-react';
import { ErrorState, ErrorInfo, getRetrySuggestions, shouldAutoRetry } from '@/lib/errorHandler';

interface EnhancedErrorDisplayProps {
  errorState: ErrorState;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const getErrorIcon = (errorType: ErrorInfo['type']) => {
  switch (errorType) {
    case 'validation': return <AlertTriangle className="h-4 w-4" />;
    case 'network': return <Wifi className="h-4 w-4" />;
    case 'server': return <Server className="h-4 w-4" />;
    case 'resource': return <Hospital className="h-4 w-4" />;
    case 'payment': return <CreditCard className="h-4 w-4" />;
    default: return <AlertCircle className="h-4 w-4" />;
  }
};

const getErrorVariant = (severity: ErrorInfo['severity']) => {
  switch (severity) {
    case 'critical': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'default';
    case 'low': return 'default';
    default: return 'default';
  }
};

const getSeverityColor = (severity: ErrorInfo['severity']) => {
  switch (severity) {
    case 'critical': return 'text-red-600 bg-red-50 border-red-200';
    case 'high': return 'text-red-500 bg-red-50 border-red-200';
    case 'medium': return 'text-orange-500 bg-orange-50 border-orange-200';
    case 'low': return 'text-yellow-500 bg-yellow-50 border-yellow-200';
    default: return 'text-gray-500 bg-gray-50 border-gray-200';
  }
};

export default function EnhancedErrorDisplay({ 
  errorState, 
  onRetry, 
  onDismiss, 
  className = '' 
}: EnhancedErrorDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  if (!errorState.hasError || !errorState.primaryError) {
    return null;
  }

  const { primaryError, errors } = errorState;
  const hasMultipleErrors = errors.length > 1;
  const suggestions = getRetrySuggestions(primaryError);
  const canRetry = primaryError.retryable && onRetry;
  const autoRetryEnabled = shouldAutoRetry(primaryError);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    onRetry?.();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Primary Error Alert */}
      <Alert variant={getErrorVariant(primaryError.severity)} className="animate-in fade-in-0 slide-in-from-top-2 duration-300">
        <div className="flex items-start gap-3">
          {getErrorIcon(primaryError.type)}
          <div className="flex-1 space-y-2">
            <AlertDescription className="font-medium">
              {primaryError.userMessage}
            </AlertDescription>
            
            {/* Error Actions */}
            <div className="flex items-center gap-2 mt-3">
              {canRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  disabled={retryCount >= 3}
                  className="h-8"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {retryCount > 0 ? `Retry (${retryCount}/3)` : 'Retry'}
                </Button>
              )}
              
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="h-8"
                >
                  Dismiss
                </Button>
              )}
              
              {(hasMultipleErrors || primaryError.message !== primaryError.userMessage) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="h-8"
                >
                  {showDetails ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Show Details
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Alert>

      {/* Suggestions Card */}
      {suggestions.length > 0 && (
        <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 delay-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4" />
              Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-1 text-sm text-gray-600">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Detailed Error Information */}
      {showDetails && (
        <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Error Details</CardTitle>
            <CardDescription>
              Technical information for troubleshooting
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {/* Primary Error Details */}
            <div className={`p-3 rounded-lg border ${getSeverityColor(primaryError.severity)}`}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Primary Error</span>
                  <span className="text-xs px-2 py-1 rounded bg-white/50">
                    {primaryError.type} • {primaryError.severity}
                  </span>
                </div>
                <p className="text-sm">{primaryError.message}</p>
                {primaryError.field && (
                  <p className="text-xs">Field: {primaryError.field}</p>
                )}
              </div>
            </div>

            {/* Additional Errors */}
            {hasMultipleErrors && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Additional Issues</h4>
                {errors.slice(1).map((error, index) => (
                  <div key={index} className={`p-2 rounded border text-sm ${getSeverityColor(error.severity)}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{error.type}</span>
                      <span className="text-xs">{error.severity}</span>
                    </div>
                    <p>{error.userMessage}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Auto-retry Information */}
            {autoRetryEnabled && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700">
                  <RefreshCw className="h-4 w-4" />
                  <span className="font-medium text-sm">Auto-retry Enabled</span>
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  This error can be automatically retried. The system will attempt to resolve the issue.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}