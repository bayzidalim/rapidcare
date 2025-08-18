'use client';

import React from 'react';
import Link from 'next/link';
import { useNavigationConfig } from '@/lib/navigationConfig';

/**
 * Example component demonstrating how to use the new navigation configuration system
 * This shows how the Navigation component can be refactored to use the new system
 */
const NavigationExample: React.FC = () => {
  // Get navigation configuration based on current auth state
  const navigationConfig = useNavigationConfig();

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <span className="text-xl font-bold text-gray-900">
              RapidCare
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {/* Primary Navigation Items */}
            {navigationConfig.primaryItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Secondary Navigation Items */}
            {navigationConfig.secondaryItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Action Items (Notification Bell, User Menu, Auth Button) */}
            <div className="flex items-center space-x-4">
              {navigationConfig.actionItems.map((actionItem, index) => (
                <div key={`${actionItem.type}-${index}`}>
                  {/* This would render the appropriate component based on actionItem.type */}
                  {actionItem.type === 'notification' && (
                    <div className="text-sm text-gray-600">🔔 Notifications</div>
                  )}
                  {actionItem.type === 'user-menu' && (
                    <div className="text-sm text-gray-600">👤 User Menu</div>
                  )}
                  {actionItem.type === 'auth' && (
                    <div className="text-sm text-gray-600">🔐 Auth</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-t border-gray-200">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navigationConfig.mobileItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default NavigationExample;