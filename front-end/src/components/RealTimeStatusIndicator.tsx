'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface RealTimeStatusIndicatorProps {
  isConnected: boolean;
  retryCount?: number;
  lastUpdate?: string | null;
  error?: string | null;
  onReconnect?: () => void;
  className?: string;
  showDetails?: boolean;
}

export default function RealTimeStatusIndicator({
  isConnected,
  retryCount = 0,
  lastUpdate,
  error,
  onReconnect,
  className = '',
  showDetails = false
}: RealTimeStatusIndicatorProps) {
  const getStatusColor = () => {
    if (error) return 'text-red-600';
    if (!isConnected) return 'text-gray-400';
    if (retryCount > 0) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = () => {
    if (error) return <AlertTriangle className="w-3 h-3" />;
    if (!isConnected) return <WifiOff className="w-3 h-3" />;
    if (retryCount > 0) return <RefreshCw className="w-3 h-3 animate-spin" />;
    return <Wifi className="w-3 h-3" />;
  };

  const getStatusText = () => {
    if (error) return 'Connection Error';
    if (!isConnected) return 'Disconnected';
    if (retryCount > 0) return `Reconnecting (${retryCount})`;
    return 'Live Updates';
  };

  const getLastUpdateText = () => {
    if (!lastUpdate) return 'Never';
    
    const now = new Date();
    const updateTime = new Date(lastUpdate);
    const diffInSeconds = Math.floor((now.getTime() - updateTime.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return updateTime.toLocaleDateString();
  };

  const tooltipContent = (
    <div className="space-y-1">
      <div className="font-medium">{getStatusText()}</div>
      {lastUpdate && (
        <div className="text-xs">Last update: {getLastUpdateText()}</div>
      )}
      {error && (
        <div className="text-xs text-red-400">Error: {error}</div>
      )}
      {onReconnect && !isConnected && (
        <div className="text-xs">Click to reconnect</div>
      )}
    </div>
  );

  if (showDetails) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`flex items-center gap-1 ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>
        
        {lastUpdate && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{getLastUpdateText()}</span>
          </div>
        )}
        
        {onReconnect && (error || !isConnected) && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReconnect}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Reconnect
          </Button>
        )}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center ${className}`}>
            {onReconnect && (error || !isConnected) ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReconnect}
                className={`h-6 px-2 ${getStatusColor()}`}
              >
                {getStatusIcon()}
              </Button>
            ) : (
              <div className={`flex items-center gap-1 ${getStatusColor()}`}>
                {getStatusIcon()}
                <span className="text-xs">{getStatusText()}</span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}