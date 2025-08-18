'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  Info
} from 'lucide-react';

interface PollingStatusIndicatorProps {
  isConnected: boolean;
  retryCount: number;
  lastUpdate: string | null;
  error: string | null;
  onReconnect?: () => void;
  showDetails?: boolean;
}

export default function PollingStatusIndicator({
  isConnected,
  retryCount,
  lastUpdate,
  error,
  onReconnect,
  showDetails = false
}: PollingStatusIndicatorProps) {
  const [showFullError, setShowFullError] = useState(false);
  
  const isPollingEnabled = process.env.NEXT_PUBLIC_ENABLE_POLLING === 'true';
  
  // If polling is disabled, show a simple info message
  if (!isPollingEnabled) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-gray-600">
          <Info className="w-3 h-3 mr-1" />
          Real-time updates disabled
        </Badge>
        {showDetails && (
          <Alert className="mt-2 border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Real-time polling is disabled. Set NEXT_PUBLIC_ENABLE_POLLING=true to enable live updates.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  const getStatusColor = () => {
    if (error?.includes('404') || error?.includes('not implemented')) {
      return 'text-yellow-600';
    }
    return isConnected ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = () => {
    if (error?.includes('404') || error?.includes('not implemented')) {
      return <AlertTriangle className="w-4 h-4" />;
    }
    return isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (error?.includes('404') || error?.includes('not implemented')) {
      return 'Endpoint not available';
    }
    return isConnected ? 'Connected' : 'Disconnected';
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1 ${getStatusColor()}`}>
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
      </div>

      {retryCount > 0 && (
        <Badge variant="outline" className="text-xs">
          {retryCount} retries
        </Badge>
      )}

      {lastUpdate && isConnected && (
        <span className="text-xs text-gray-500">
          Updated {new Date(lastUpdate).toLocaleTimeString()}
        </span>
      )}

      {error && !error.includes('404') && !error.includes('not implemented') && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFullError(!showFullError)}
            className="text-red-600 hover:text-red-700"
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            Error
          </Button>
          {onReconnect && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReconnect}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
      )}

      {showFullError && error && (
        <Alert className="mt-2 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {showDetails && (
        <div className="mt-2">
          {error?.includes('404') || error?.includes('not implemented') ? (
            <Alert className="border-yellow-200 bg-yellow-50">
              <Info className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Real-time polling endpoints are not yet implemented on the backend. 
                The application will work normally without live updates.
              </AlertDescription>
            </Alert>
          ) : isConnected ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Real-time updates are working. Data will refresh automatically.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Unable to connect to real-time updates. Please check your connection or try refreshing manually.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}