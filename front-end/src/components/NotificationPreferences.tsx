'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Bell, Mail, MessageSquare, Smartphone, Save, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { authAPI } from '@/lib/api';
import { NotificationPreferences } from '@/lib/types';

interface NotificationPreferencesProps {
  userId: number;
  className?: string;
}

const NotificationPreferencesComponent: React.FC<NotificationPreferencesProps> = ({
  userId,
  className = ''
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    userId,
    emailEnabled: true,
    smsEnabled: true,
    pushEnabled: true,
    bookingApprovalEmail: true,
    bookingApprovalSms: true,
    bookingDeclineEmail: true,
    bookingDeclineSms: true,
    bookingCompletionEmail: true,
    bookingCompletionSms: false,
    bookingCancellationEmail: true,
    bookingCancellationSms: true,
    resourceThresholdEmail: false,
    resourceThresholdSms: false,
    systemAlertEmail: true,
    systemAlertSms: false,
    updatedAt: new Date().toISOString()
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError(null);

      // For now, we'll use default preferences since the backend endpoint doesn't exist yet
      // In a real implementation, you would call an API endpoint like:
      // const response = await authAPI.getNotificationPreferences();
      
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Use default preferences for now
      setPreferences(prev => ({ ...prev, userId }));
      
    } catch (err: any) {
      setError('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // For now, we'll simulate saving since the backend endpoint doesn't exist yet
      // In a real implementation, you would call an API endpoint like:
      // const response = await authAPI.updateNotificationPreferences(preferences);
      
      // Simulate saving delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('Notification preferences saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err: any) {
      setError('Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
      updatedAt: new Date().toISOString()
    }));
  };

  const toggleGlobalChannel = (channel: 'email' | 'sms' | 'push', enabled: boolean) => {
    const channelKey = `${channel}Enabled` as keyof NotificationPreferences;
    
    setPreferences(prev => {
      const updated = { ...prev, [channelKey]: enabled };
      
      // If disabling a channel, disable all specific notifications for that channel
      if (!enabled) {
        Object.keys(updated).forEach(key => {
          if (key.includes(channel === 'email' ? 'Email' : 
                          channel === 'sms' ? 'Sms' : 
                          'Push')) {
            (updated as any)[key] = false;
          }
        });
      }
      
      return { ...updated, updatedAt: new Date().toISOString() };
    });
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Manage how you receive notifications about your bookings and account activity.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Global Channel Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Notification Channels</h3>
          <p className="text-sm text-gray-600">
            Enable or disable entire notification channels. Disabling a channel will turn off all notifications for that method.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-blue-500" />
                <div>
                  <Label className="font-medium">Email</Label>
                  <p className="text-xs text-gray-500">Receive notifications via email</p>
                </div>
              </div>
              <Switch
                checked={preferences.emailEnabled}
                onCheckedChange={(checked) => toggleGlobalChannel('email', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-green-500" />
                <div>
                  <Label className="font-medium">SMS</Label>
                  <p className="text-xs text-gray-500">Receive notifications via text message</p>
                </div>
              </div>
              <Switch
                checked={preferences.smsEnabled}
                onCheckedChange={(checked) => toggleGlobalChannel('sms', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-purple-500" />
                <div>
                  <Label className="font-medium">Push</Label>
                  <p className="text-xs text-gray-500">Receive push notifications</p>
                </div>
              </div>
              <Switch
                checked={preferences.pushEnabled}
                onCheckedChange={(checked) => toggleGlobalChannel('push', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Booking Notifications */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Booking Notifications</h3>
          <p className="text-sm text-gray-600">
            Choose how you want to be notified about booking status changes.
          </p>
          
          <div className="space-y-4">
            {/* Booking Approval */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="h-4 w-4 text-green-500" />
                <Label className="font-medium">Booking Approved</Label>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                When your booking request is approved by the hospital
              </p>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="booking-approval-email"
                    checked={preferences.bookingApprovalEmail && preferences.emailEnabled}
                    onCheckedChange={(checked) => updatePreference('bookingApprovalEmail', checked)}
                    disabled={!preferences.emailEnabled}
                  />
                  <Label htmlFor="booking-approval-email" className="text-sm">Email</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="booking-approval-sms"
                    checked={preferences.bookingApprovalSms && preferences.smsEnabled}
                    onCheckedChange={(checked) => updatePreference('bookingApprovalSms', checked)}
                    disabled={!preferences.smsEnabled}
                  />
                  <Label htmlFor="booking-approval-sms" className="text-sm">SMS</Label>
                </div>
              </div>
            </div>

            {/* Booking Decline */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="h-4 w-4 text-red-500" />
                <Label className="font-medium">Booking Declined</Label>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                When your booking request is declined by the hospital
              </p>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="booking-decline-email"
                    checked={preferences.bookingDeclineEmail && preferences.emailEnabled}
                    onCheckedChange={(checked) => updatePreference('bookingDeclineEmail', checked)}
                    disabled={!preferences.emailEnabled}
                  />
                  <Label htmlFor="booking-decline-email" className="text-sm">Email</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="booking-decline-sms"
                    checked={preferences.bookingDeclineSms && preferences.smsEnabled}
                    onCheckedChange={(checked) => updatePreference('bookingDeclineSms', checked)}
                    disabled={!preferences.smsEnabled}
                  />
                  <Label htmlFor="booking-decline-sms" className="text-sm">SMS</Label>
                </div>
              </div>
            </div>

            {/* Booking Completion */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="h-4 w-4 text-blue-500" />
                <Label className="font-medium">Booking Completed</Label>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                When your booking is marked as completed
              </p>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="booking-completion-email"
                    checked={preferences.bookingCompletionEmail && preferences.emailEnabled}
                    onCheckedChange={(checked) => updatePreference('bookingCompletionEmail', checked)}
                    disabled={!preferences.emailEnabled}
                  />
                  <Label htmlFor="booking-completion-email" className="text-sm">Email</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="booking-completion-sms"
                    checked={preferences.bookingCompletionSms && preferences.smsEnabled}
                    onCheckedChange={(checked) => updatePreference('bookingCompletionSms', checked)}
                    disabled={!preferences.smsEnabled}
                  />
                  <Label htmlFor="booking-completion-sms" className="text-sm">SMS</Label>
                </div>
              </div>
            </div>

            {/* Booking Cancellation */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="h-4 w-4 text-orange-500" />
                <Label className="font-medium">Booking Cancelled</Label>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                When your booking is cancelled by you or the hospital
              </p>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="booking-cancellation-email"
                    checked={preferences.bookingCancellationEmail && preferences.emailEnabled}
                    onCheckedChange={(checked) => updatePreference('bookingCancellationEmail', checked)}
                    disabled={!preferences.emailEnabled}
                  />
                  <Label htmlFor="booking-cancellation-email" className="text-sm">Email</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="booking-cancellation-sms"
                    checked={preferences.bookingCancellationSms && preferences.smsEnabled}
                    onCheckedChange={(checked) => updatePreference('bookingCancellationSms', checked)}
                    disabled={!preferences.smsEnabled}
                  />
                  <Label htmlFor="booking-cancellation-sms" className="text-sm">SMS</Label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* System Notifications */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">System Notifications</h3>
          <p className="text-sm text-gray-600">
            Notifications about system updates and important alerts.
          </p>
          
          <div className="space-y-4">
            {/* Resource Threshold */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="h-4 w-4 text-yellow-500" />
                <Label className="font-medium">Resource Alerts</Label>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Alerts about resource availability at hospitals you're interested in
              </p>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="resource-threshold-email"
                    checked={preferences.resourceThresholdEmail && preferences.emailEnabled}
                    onCheckedChange={(checked) => updatePreference('resourceThresholdEmail', checked)}
                    disabled={!preferences.emailEnabled}
                  />
                  <Label htmlFor="resource-threshold-email" className="text-sm">Email</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="resource-threshold-sms"
                    checked={preferences.resourceThresholdSms && preferences.smsEnabled}
                    onCheckedChange={(checked) => updatePreference('resourceThresholdSms', checked)}
                    disabled={!preferences.smsEnabled}
                  />
                  <Label htmlFor="resource-threshold-sms" className="text-sm">SMS</Label>
                </div>
              </div>
            </div>

            {/* System Alerts */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="h-4 w-4 text-purple-500" />
                <Label className="font-medium">System Alerts</Label>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Important system updates, maintenance notifications, and security alerts
              </p>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="system-alert-email"
                    checked={preferences.systemAlertEmail && preferences.emailEnabled}
                    onCheckedChange={(checked) => updatePreference('systemAlertEmail', checked)}
                    disabled={!preferences.emailEnabled}
                  />
                  <Label htmlFor="system-alert-email" className="text-sm">Email</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="system-alert-sms"
                    checked={preferences.systemAlertSms && preferences.smsEnabled}
                    onCheckedChange={(checked) => updatePreference('systemAlertSms', checked)}
                    disabled={!preferences.smsEnabled}
                  />
                  <Label htmlFor="system-alert-sms" className="text-sm">SMS</Label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={savePreferences} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Preferences
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationPreferencesComponent;