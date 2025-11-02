/**
 * Core Web Vitals monitoring for hydration performance
 */

export interface WebVitalsMetrics {
  CLS: number; // Cumulative Layout Shift
  FID: number; // First Input Delay
  LCP: number; // Largest Contentful Paint
  FCP: number; // First Contentful Paint
  TTFB: number; // Time to First Byte
}

export interface LayoutShiftEntry {
  value: number;
  startTime: number;
  sources: Array<{
    node?: Element;
    previousRect: DOMRect;
    currentRect: DOMRect;
  }>;
}

export class WebVitalsMonitor {
  private static instance: WebVitalsMonitor;
  private metrics: Partial<WebVitalsMetrics> = {};
  private observers: PerformanceObserver[] = [];
  private layoutShifts: LayoutShiftEntry[] = [];

  static getInstance(): WebVitalsMonitor {
    if (!WebVitalsMonitor.instance) {
      WebVitalsMonitor.instance = new WebVitalsMonitor();
    }
    return WebVitalsMonitor.instance;
  }

  /**
   * Starts monitoring Core Web Vitals
   */
  startMonitoring(): void {
    if (typeof window === 'undefined') return;

    this.monitorCLS();
    this.monitorFID();
    this.monitorLCP();
    this.monitorFCP();
    this.monitorTTFB();
  }

  /**
   * Monitors Cumulative Layout Shift
   */
  private monitorCLS(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        let clsValue = 0;
        
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            
            this.layoutShifts.push({
              value: (entry as any).value,
              startTime: entry.startTime,
              sources: (entry as any).sources || [],
            });
          }
        }
        
        this.metrics.CLS = (this.metrics.CLS || 0) + clsValue;
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('CLS monitoring not supported:', error);
    }
  }  /**

   * Monitors First Input Delay
   */
  private monitorFID(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'first-input') {
            this.metrics.FID = (entry as any).processingStart - entry.startTime;
          }
        }
      });

      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('FID monitoring not supported:', error);
    }
  }

  /**
   * Monitors Largest Contentful Paint
   */
  private monitorLCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.metrics.LCP = lastEntry.startTime;
        }
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('LCP monitoring not supported:', error);
    }
  }

  /**
   * Monitors First Contentful Paint
   */
  private monitorFCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.FCP = entry.startTime;
          }
        }
      });

      observer.observe({ entryTypes: ['paint'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('FCP monitoring not supported:', error);
    }
  }

  /**
   * Monitors Time to First Byte
   */
  private monitorTTFB(): void {
    try {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationEntry) {
        this.metrics.TTFB = navigationEntry.responseStart - navigationEntry.requestStart;
      }
    } catch (error) {
      console.warn('TTFB monitoring not supported:', error);
    }
  }

  /**
   * Gets current metrics
   */
  getMetrics(): Partial<WebVitalsMetrics> {
    return { ...this.metrics };
  }

  /**
   * Gets layout shift details for debugging
   */
  getLayoutShifts(): LayoutShiftEntry[] {
    return [...this.layoutShifts];
  }

  /**
   * Validates metrics against thresholds
   */
  validateMetrics(): {
    isGood: boolean;
    needsImprovement: string[];
    poor: string[];
  } {
    const needsImprovement: string[] = [];
    const poor: string[] = [];

    // CLS thresholds: Good < 0.1, Needs Improvement < 0.25, Poor >= 0.25
    if (this.metrics.CLS !== undefined) {
      if (this.metrics.CLS >= 0.25) {
        poor.push(`CLS: ${this.metrics.CLS.toFixed(3)} (threshold: < 0.25)`);
      } else if (this.metrics.CLS >= 0.1) {
        needsImprovement.push(`CLS: ${this.metrics.CLS.toFixed(3)} (threshold: < 0.1)`);
      }
    }

    // FID thresholds: Good < 100ms, Needs Improvement < 300ms, Poor >= 300ms
    if (this.metrics.FID !== undefined) {
      if (this.metrics.FID >= 300) {
        poor.push(`FID: ${this.metrics.FID.toFixed(0)}ms (threshold: < 300ms)`);
      } else if (this.metrics.FID >= 100) {
        needsImprovement.push(`FID: ${this.metrics.FID.toFixed(0)}ms (threshold: < 100ms)`);
      }
    }

    // LCP thresholds: Good < 2.5s, Needs Improvement < 4s, Poor >= 4s
    if (this.metrics.LCP !== undefined) {
      const lcpSeconds = this.metrics.LCP / 1000;
      if (lcpSeconds >= 4) {
        poor.push(`LCP: ${lcpSeconds.toFixed(1)}s (threshold: < 4s)`);
      } else if (lcpSeconds >= 2.5) {
        needsImprovement.push(`LCP: ${lcpSeconds.toFixed(1)}s (threshold: < 2.5s)`);
      }
    }

    return {
      isGood: needsImprovement.length === 0 && poor.length === 0,
      needsImprovement,
      poor,
    };
  }

  /**
   * Stops monitoring and cleans up observers
   */
  stopMonitoring(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  /**
   * Resets all metrics
   */
  reset(): void {
    this.metrics = {};
    this.layoutShifts = [];
  }
}

/**
 * Hook for Web Vitals monitoring
 */
export function useWebVitals() {
  const monitor = WebVitalsMonitor.getInstance();

  const startMonitoring = () => monitor.startMonitoring();
  const stopMonitoring = () => monitor.stopMonitoring();
  const getMetrics = () => monitor.getMetrics();
  const getLayoutShifts = () => monitor.getLayoutShifts();
  const validateMetrics = () => monitor.validateMetrics();
  const reset = () => monitor.reset();

  return {
    startMonitoring,
    stopMonitoring,
    getMetrics,
    getLayoutShifts,
    validateMetrics,
    reset,
  };
}

// Export singleton instance
export const webVitalsMonitor = WebVitalsMonitor.getInstance();