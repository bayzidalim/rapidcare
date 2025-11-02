import { useEffect } from 'react';
import { useWebVitals } from '@/lib/performance/webVitals';
import { useHydrationPerformance } from '@/lib/performance/hydrationValidator';

interface PerformanceMonitorProps {
  /**
   * Whether to enable monitoring in production
   */
  enableInProduction?: boolean;
  
  /**
   * Callback for performance violations
   */
  onPerformanceViolation?: (violations: string[], recommendations: string[]) => void;
  
  /**
   * Callback for Web Vitals metrics
   */
  onWebVitalsUpdate?: (metrics: any) => void;
}

/**
 * Performance monitoring component for hydration and Web Vitals
 * Should be included in the app layout to monitor performance
 */
export function PerformanceMonitor({
  enableInProduction = false,
  onPerformanceViolation,
  onWebVitalsUpdate,
}: PerformanceMonitorProps) {
  const webVitals = useWebVitals();
  const hydrationPerf = useHydrationPerformance();

  useEffect(() => {
    // Only monitor in development or if explicitly enabled in production
    if (process.env.NODE_ENV === 'production' && !enableInProduction) {
      return;
    }

    // Start Web Vitals monitoring
    webVitals.startMonitoring();

    // Check performance periodically
    const performanceCheckInterval = setInterval(() => {
      // Validate hydration performance
      const hydrationValidation = hydrationPerf.validatePerformance();
      if (!hydrationValidation.isValid && onPerformanceViolation) {
        onPerformanceViolation(hydrationValidation.violations, hydrationValidation.recommendations);
      }

      // Check Web Vitals
      const vitalsMetrics = webVitals.getMetrics();
      const vitalsValidation = webVitals.validateMetrics();
      
      if (onWebVitalsUpdate) {
        onWebVitalsUpdate({
          metrics: vitalsMetrics,
          validation: vitalsValidation,
        });
      }

      // Log performance issues in development
      if (process.env.NODE_ENV === 'development') {
        if (!hydrationValidation.isValid) {
          console.warn('Hydration Performance Issues:', {
            violations: hydrationValidation.violations,
            recommendations: hydrationValidation.recommendations,
          });
        }

        if (!vitalsValidation.isGood) {
          console.warn('Web Vitals Issues:', {
            needsImprovement: vitalsValidation.needsImprovement,
            poor: vitalsValidation.poor,
          });
        }

        // Log layout shifts for debugging
        const layoutShifts = webVitals.getLayoutShifts();
        if (layoutShifts.length > 0) {
          console.log('Layout Shifts Detected:', layoutShifts);
        }
      }
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(performanceCheckInterval);
      webVitals.stopMonitoring();
    };
  }, [enableInProduction, onPerformanceViolation, onWebVitalsUpdate, webVitals, hydrationPerf]);

  // This component doesn't render anything
  return null;
}

/**
 * Development-only performance monitor with console logging
 */
export function DevPerformanceMonitor() {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <PerformanceMonitor
      enableInProduction={false}
      onPerformanceViolation={(violations, recommendations) => {
        console.group('🚨 Performance Violations Detected');
        console.warn('Violations:', violations);
        console.info('Recommendations:', recommendations);
        console.groupEnd();
      }}
      onWebVitalsUpdate={({ metrics, validation }) => {
        if (!validation.isGood) {
          console.group('📊 Web Vitals Update');
          console.log('Metrics:', metrics);
          console.warn('Needs Improvement:', validation.needsImprovement);
          console.error('Poor:', validation.poor);
          console.groupEnd();
        }
      }}
    />
  );
}

/**
 * Production performance monitor with error reporting
 */
export function ProductionPerformanceMonitor() {
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  return (
    <PerformanceMonitor
      enableInProduction={true}
      onPerformanceViolation={(violations, recommendations) => {
        // Send to error tracking service
        if (typeof window !== 'undefined' && (window as any).errorTracker) {
          (window as any).errorTracker.captureMessage('Performance Violations', {
            level: 'warning',
            extra: { violations, recommendations },
            tags: { type: 'performance' },
          });
        }
      }}
      onWebVitalsUpdate={({ metrics, validation }) => {
        // Send Web Vitals to analytics
        if (typeof window !== 'undefined' && (window as any).analytics) {
          (window as any).analytics.track('Web Vitals', {
            ...metrics,
            isGood: validation.isGood,
            needsImprovement: validation.needsImprovement.length,
            poor: validation.poor.length,
          });
        }
      }}
    />
  );
}