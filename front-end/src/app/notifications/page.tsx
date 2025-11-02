'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PatientNotificationCenter from '@/components/PatientNotificationCenter';
import NotificationHistory from '@/components/NotificationHistory';
import NotificationPreferences from '@/components/NotificationPreferences';
import ProtectedRoute from '@/components/ProtectedRoute';

const NotificationsPage: React.FC = () => {
  // Mock user ID - in real app this would come from auth context
  const userId = 1;

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Notification Center
          </h1>
          <p className="text-gray-600">
            Manage your notifications, view history, and customize your preferences.
          </p>
        </div>

        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="notifications">Current Notifications</TabsTrigger>
            <TabsTrigger value="history">Notification History</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="space-y-6">
            <PatientNotificationCenter userId={userId} />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <NotificationHistory userId={userId} />
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <NotificationPreferences userId={userId} />
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
};

export default NotificationsPage;