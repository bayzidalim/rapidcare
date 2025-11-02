'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { auditAPI } from '@/lib/api';
import { AuditTrailEntry, ApprovalMetrics, ApprovalEfficiency } from '@/lib/types';
import { 
  History, 
  User, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  TrendingUp,
  BarChart3
} from 'lucide-react';

interface AuditTrailViewerProps {
  entityType?: string;
  entityId?: number;
  showMetrics?: boolean;
}

export default function AuditTrailViewer({ 
  entityType, 
  entityId, 
  showMetrics = false 
}: AuditTrailViewerProps) {
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([]);
  const [metrics, setMetrics] = useState<ApprovalMetrics[]>([]);
  const [efficiency, setEfficiency] = useState<ApprovalEfficiency | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Fetch audit trail
  const fetchAuditTrail = async () => {
    if (!entityType || !entityId) return;
    
    try {
      setLoading(true);
      const response = await auditAPI.getEntityAuditTrail(entityType, entityId);
      if (response.data.success) {
        setAuditTrail(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching audit trail:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch approval metrics
  const fetchMetrics = async () => {
    try {
      const [metricsResponse, efficiencyResponse] = await Promise.all([
        auditAPI.getApprovalMetrics(),
        auditAPI.getApprovalEfficiency()
      ]);

      if (metricsResponse.data.success) {
        setMetrics(metricsResponse.data.data);
      }

      if (efficiencyResponse.data.success) {
        setEfficiency(efficiencyResponse.data.data);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  // Get action icon
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'submitted':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'resubmitted':
        return <RefreshCw className="w-4 h-4 text-orange-600" />;
      default:
        return <History className="w-4 h-4 text-gray-600" />;
    }
  };

  // Get action color
  const getActionColor = (action: string) => {
    switch (action) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'submitted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resubmitted':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Format time duration
  const formatDuration = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} minutes`;
    } else if (hours < 24) {
      return `${Math.round(hours)} hours`;
    } else {
      return `${Math.round(hours / 24)} days`;
    }
  };

  // Fetch data when dialog opens
  useEffect(() => {
    if (open) {
      if (entityType && entityId) {
        fetchAuditTrail();
      }
      if (showMetrics) {
        fetchMetrics();
      }
    }
  }, [open, entityType, entityId, showMetrics]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="w-4 h-4 mr-2" />
          {showMetrics ? 'View Analytics' : 'View History'}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            {showMetrics ? 'Approval Analytics & Audit Trail' : 'Audit Trail'}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh]">
          {/* Metrics Section */}
          {showMetrics && (
            <div className="mb-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Approval Efficiency Metrics</h3>
              </div>
              
              {efficiency && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {efficiency.total_submissions}
                      </div>
                      <div className="text-sm text-gray-600">Total Submissions</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {efficiency.approval_rate}%
                      </div>
                      <div className="text-sm text-gray-600">Approval Rate</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {efficiency.rejection_rate}%
                      </div>
                      <div className="text-sm text-gray-600">Rejection Rate</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {formatDuration(efficiency.avg_approval_time_hours)}
                      </div>
                      <div className="text-sm text-gray-600">Avg. Approval Time</div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {metrics.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Action Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {metrics.map((metric, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            {getActionIcon(metric.action)}
                            <span className="font-medium capitalize">{metric.action}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{metric.count}</div>
                            {metric.avg_approval_time_hours && (
                              <div className="text-xs text-gray-500">
                                Avg: {formatDuration(metric.avg_approval_time_hours)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Audit Trail Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold">Activity History</h3>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : auditTrail.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No activity history available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {auditTrail.map((entry) => (
                  <Card key={entry.id} className="border-l-4 border-l-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getActionIcon(entry.action)}
                            <Badge className={getActionColor(entry.action)}>
                              {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {entry.entityType} #{entry.entityId}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>{entry.userName || 'System'}</span>
                              {entry.userType && (
                                <Badge variant="outline" className="text-xs">
                                  {entry.userType}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(entry.createdAt).toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Metadata */}
                          {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                              <div className="font-medium mb-1">Details:</div>
                              {entry.metadata.reason && (
                                <div><strong>Reason:</strong> {entry.metadata.reason}</div>
                              )}
                              {entry.metadata.notes && (
                                <div><strong>Notes:</strong> {entry.metadata.notes}</div>
                              )}
                              {entry.metadata.hospitalName && (
                                <div><strong>Hospital:</strong> {entry.metadata.hospitalName}</div>
                              )}
                            </div>
                          )}

                          {/* Data Changes */}
                          {(entry.oldData || entry.newData) && (
                            <details className="mt-2">
                              <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                                View data changes
                              </summary>
                              <div className="mt-2 p-2 bg-gray-50 rounded text-xs space-y-1">
                                {entry.oldData && Object.keys(entry.oldData).length > 0 && (
                                  <div>
                                    <strong>Before:</strong>
                                    <pre className="mt-1 text-xs overflow-x-auto">
                                      {JSON.stringify(entry.oldData, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {entry.newData && Object.keys(entry.newData).length > 0 && (
                                  <div>
                                    <strong>After:</strong>
                                    <pre className="mt-1 text-xs overflow-x-auto">
                                      {JSON.stringify(entry.newData, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}