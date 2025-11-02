'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Clock,
  Shield,
  Zap,
  Target,
  TrendingUp
} from 'lucide-react';
import { adminAPI } from '@/lib/api';
import { getUserFriendlyErrorMessage, validateRejectionReason } from '@/lib/errorHandling';

interface ErrorHandlingDemoProps {
  hospitalId?: number;
}

export default function ErrorHandlingDemo({ hospitalId = 1 }: ErrorHandlingDemoProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [validationError, setValidationError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [progress, setProgress] = useState(0);

  // Demo: Approval with error handling
  const handleApprovalDemo = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setRetryCount(0);
    setProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await adminAPI.approveHospital(hospitalId);
      
      clearInterval(progressInterval);
      setProgress(100);

      if (result.success) {
        setSuccess('✅ Hospital approved successfully! The hospital is now visible to users and can accept bookings.');
      } else {
        setError(result.error || 'Failed to approve hospital');
      }
    } catch (err: any) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  // Demo: Rejection with validation
  const handleRejectionDemo = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setValidationError('');

    // Client-side validation
    const validation = validateRejectionReason(rejectionReason);
    if (!validation.valid) {
      setValidationError(validation.error!);
      setLoading(false);
      return;
    }

    try {
      const result = await adminAPI.rejectHospital(hospitalId, { reason: rejectionReason });
      
      if (result.success) {
        setSuccess('✅ Hospital rejected successfully! The hospital authority has been notified and can resubmit after addressing the issues.');
        setRejectionReason('');
      } else {
        setError(result.error || 'Failed to reject hospital');
      }
    } catch (err: any) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Demo: Retry mechanism
  const handleRetryDemo = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setRetryCount(0);

    const maxRetries = 3;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      setRetryCount(attempt + 1);
      
      try {
        // Simulate API call that might fail
        if (Math.random() < 0.7 && attempt < maxRetries) {
          throw new Error('Network timeout - simulated failure');
        }
        
        setSuccess(`✅ Operation succeeded on attempt ${attempt + 1}!`);
        setLoading(false);
        return;
      } catch (err) {
        if (attempt === maxRetries) {
          setError(`❌ Operation failed after ${maxRetries + 1} attempts. Please try again later.`);
          setLoading(false);
          return;
        }
        
        // Wait before retry with exponential backoff
        const delay = 1000 * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  // Demo: Rate limiting
  const handleRateLimitDemo = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Simulate multiple rapid requests
      const promises = Array.from({ length: 5 }, (_, i) => 
        adminAPI.approveHospital(hospitalId + i)
      );
      
      const results = await Promise.allSettled(promises);
      const rateLimited = results.some(result => 
        result.status === 'fulfilled' && 
        !result.value.success && 
        result.value.code === 'RATE_LIMIT_EXCEEDED'
      );
      
      if (rateLimited) {
        setError('⚠️ Rate limit exceeded. Please wait before making more requests.');
      } else {
        setSuccess('✅ All requests processed successfully!');
      }
    } catch (err: any) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleValidationChange = (value: string) => {
    setRejectionReason(value);
    setValidationError('');
    
    // Real-time validation
    const validation = validateRejectionReason(value);
    if (value && !validation.valid) {
      setValidationError(validation.error!);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Error Handling & User Feedback Demo
          </CardTitle>
          <CardDescription>
            Comprehensive error handling, validation, retry mechanisms, and user feedback examples
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Progress Indicator */}
          {progress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Success Message */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Demo Sections */}
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Approval Demo */}
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Approval with Progress
                </CardTitle>
                <CardDescription>
                  Demonstrates approval process with loading states and progress indication
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleApprovalDemo}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Demo Approval
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Retry Demo */}
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                  Retry Mechanism
                </CardTitle>
                <CardDescription>
                  Shows automatic retry with exponential backoff on failures
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {retryCount > 0 && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Clock className="w-4 h-4" />
                      Attempt {retryCount} of 4
                    </div>
                  )}
                  <Button 
                    onClick={handleRetryDemo}
                    disabled={loading}
                    className="w-full"
                    variant="outline"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Demo Retry Logic
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Rejection with Validation */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                Rejection with Real-time Validation
              </CardTitle>
              <CardDescription>
                Demonstrates client-side validation with immediate feedback
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="rejection-reason">Rejection Reason</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Enter rejection reason (minimum 10 characters)..."
                  value={rejectionReason}
                  onChange={(e) => handleValidationChange(e.target.value)}
                  className={validationError ? 'border-red-300' : ''}
                />
                {validationError && (
                  <p className="text-sm text-red-600 mt-1">{validationError}</p>
                )}
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Characters: {rejectionReason.length}</span>
                  <span>Min: 10, Max: 500</span>
                </div>
              </div>
              <Button 
                onClick={handleRejectionDemo}
                disabled={loading || !!validationError || !rejectionReason.trim()}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Demo Rejection
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Rate Limiting Demo */}
          <Card className="border-yellow-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-4 h-4 text-yellow-600" />
                Rate Limiting Protection
              </CardTitle>
              <CardDescription>
                Shows how the system handles rapid requests and rate limiting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleRateLimitDemo}
                disabled={loading}
                className="w-full bg-yellow-600 hover:bg-yellow-700"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Testing Rate Limits...
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4 mr-2" />
                    Demo Rate Limiting
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Error Handling Features */}
          <Card className="border-purple-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                Error Handling Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">✅ Implemented Features</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• User-friendly error messages</li>
                    <li>• Automatic retry with exponential backoff</li>
                    <li>• Real-time input validation</li>
                    <li>• Rate limiting protection</li>
                    <li>• Loading states and progress indicators</li>
                    <li>• Confirmation dialogs for critical actions</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">🛡️ Error Types Handled</h4>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">Network Errors</Badge>
                    <Badge variant="outline" className="text-xs">Validation Errors</Badge>
                    <Badge variant="outline" className="text-xs">Permission Errors</Badge>
                    <Badge variant="outline" className="text-xs">Rate Limiting</Badge>
                    <Badge variant="outline" className="text-xs">Server Errors</Badge>
                    <Badge variant="outline" className="text-xs">Timeout Errors</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </CardContent>
      </Card>
    </div>
  );
}