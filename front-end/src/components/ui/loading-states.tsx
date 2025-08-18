"use client"

import React from 'react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from './loading-spinner';
import { Skeleton, SkeletonCard } from './skeleton';
import { Card, CardContent, CardHeader } from './card';

// Full page loading
interface PageLoadingProps {
  message?: string;
  className?: string;
}

export const PageLoading: React.FC<PageLoadingProps> = ({ 
  message = "Loading...", 
  className 
}) => (
  <div className={cn(
    "min-h-screen bg-gray-50 flex items-center justify-center",
    className
  )}>
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-lg text-gray-600">{message}</p>
    </div>
  </div>
);

// Section loading
interface SectionLoadingProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const SectionLoading: React.FC<SectionLoadingProps> = ({ 
  message = "Loading...", 
  className,
  size = "md"
}) => {
  const sizeClasses = {
    sm: "py-8",
    md: "py-12", 
    lg: "py-16"
  };

  return (
    <div className={cn(
      "flex items-center justify-center",
      sizeClasses[size],
      className
    )}>
      <div className="text-center">
        <LoadingSpinner size={size} />
        <p className="mt-2 text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
};

// Button loading state
interface ButtonLoadingProps {
  loading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
}

export const ButtonLoading: React.FC<ButtonLoadingProps> = ({
  loading,
  children,
  loadingText,
  className
}) => (
  <span className={cn("flex items-center gap-2", className)}>
    {loading && <LoadingSpinner size="sm" />}
    {loading && loadingText ? loadingText : children}
  </span>
);

// Card loading skeleton
export const CardLoading: React.FC<{ className?: string }> = ({ className }) => (
  <Card className={className}>
    <CardHeader>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="flex gap-2 mt-4">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Hospital card loading
export const HospitalCardLoading: React.FC<{ className?: string }> = ({ className }) => (
  <Card className={className}>
    <CardHeader>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <Skeleton className="h-6 w-3/4 mb-2" />
          <div className="flex gap-4 mb-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div>
          <Skeleton className="h-5 w-40 mb-3" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-6 w-12 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="h-5 w-36 mb-2" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Booking card loading
export const BookingCardLoading: React.FC<{ className?: string }> = ({ className }) => (
  <Card className={className}>
    <CardContent className="p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-12" />
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[1, 2, 3].map(i => (
          <div key={i}>
            <div className="flex items-center gap-2 mb-1">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
      
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>
    </CardContent>
  </Card>
);

// List loading with multiple skeletons
interface ListLoadingProps {
  count?: number;
  itemComponent?: React.ComponentType<{ className?: string }>;
  className?: string;
}

export const ListLoading: React.FC<ListLoadingProps> = ({ 
  count = 3, 
  itemComponent: ItemComponent = CardLoading,
  className 
}) => (
  <div className={cn("space-y-4", className)}>
    {Array.from({ length: count }).map((_, i) => (
      <ItemComponent key={i} />
    ))}
  </div>
);