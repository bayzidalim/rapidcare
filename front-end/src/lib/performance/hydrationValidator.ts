/**
 * Hydration performance validation utilities
 * Provides tools to validate and monitor hydration performance
 */

export interface HydrationMetrics {
  hydrationStartTime: number;
  hydrationEndTime: number;
  hydrationDuration: number;
  authCheckDuration: number;
  renderCount: number;
  errorCount: number;
  retryCount: number;
}

export interface PerformanceThresholds {
  maxHydrationTime: number;
  maxAuthCheckTime: number;
  maxRenderCount: number;
  maxErrorRate: number;
}

export class HydrationValidator {
  private static instance: HydrationValidator;
  private metrics: HydrationMetrics[] = [];
  private currentSession: Partial<HydrationMetrics> = {};
  private thresholds: PerformanceThresholds = {
    maxHydrationTime: 1000, // 1 second
    maxAuthCheckTime: 500,  // 500ms
    maxRenderCount: 10,     // Max renders per session
    maxErrorRate: 0.1,      // 10% error rate
  };

  static getInstance(): HydrationValidator {
    if (!HydrationValidator.instance) {
      HydrationValidator.instance = new HydrationValidator();
    }
    return HydrationValidator.instance;
  }

  /**
   * Marks the start of hydration process
   */
  startHydration(): void {
    this.currentSession = {
      hydrationStartTime: performance.now(),
      renderCount: 0,
      errorCount: 0,
      retryCount: 0,
    };
  }

  /**
   * Marks the end of hydration process
   */
  endHydration(): void {
    if (this.currentSession.hydrationStartTime) {
      this.currentSession.hydrationEndTime = performance.now();
      this.currentSession.hydrationDuration = 
        this.currentSession.hydrationEndTime - this.currentSession.hydrationStartTime;
    }
  }

  /**
   * Records authentication check timing
   */
  recordAuthCheck(startTime: number, endTime: number): void {
    this.currentSession.authCheckDuration = endTime - startTime;
  }

  /**
   * Increments render count
   */
  incrementRenderCount(): void {
    this.currentSession.renderCount = (this.currentSession.renderCount || 0) + 1;
  }

  /**
   * Records an error occurrence
   */
  recordError(): void {
    this.currentSession.errorCount = (this.currentSession.errorCount || 0) + 1;
  }

  /**
   * Records a retry attempt
   */
  recordRetry(): void {
    this.currentSession.retryCount = (this.currentSession.retryCount || 0) + 1;
  }

  /**
   * Completes the current session and stores metrics
   */
  completeSession(): HydrationMetrics | null {
    if (!this.currentSession.hydrationStartTime) {
      return null;
    }

    const completedMetrics: HydrationMetrics = {
      hydrationStartTime: this.currentSession.hydrationStartTime,
      hydrationEndTime: this.currentSession.hydrationEndTime || performance.now(),
      hydrationDuration: this.currentSession.hydrationDuration || 0,
      authCheckDuration: this.currentSession.authCheckDuration || 0,
      renderCount: this.currentSession.renderCount || 0,
      errorCount: this.currentSession.errorCount || 0,
      retryCount: this.currentSession.retryCount || 0,
    };

    this.metrics.push(completedMetrics);
    this.currentSession = {};

    return completedMetrics;
  }

  /**
   * Validates current performance against thresholds
   */
  validatePerformance(): {
    isValid: boolean;
    violations: string[];
    recommendations: string[];
  } {
    const violations: string[] = [];
    const recommendations: string[] = [];

    if (this.currentSession.hydrationDuration && 
        this.currentSession.hydrationDuration > this.thresholds.maxHydrationTime) {
      violations.push(`Hydration time (${this.currentSession.hydrationDuration}ms) exceeds threshold (${this.thresholds.maxHydrationTime}ms)`);
      recommendations.push('Consider optimizing component rendering or reducing initial state complexity');
    }

    if (this.currentSession.authCheckDuration && 
        this.currentSession.authCheckDuration > this.thresholds.maxAuthCheckTime) {
      violations.push(`Auth check time (${this.currentSession.authCheckDuration}ms) exceeds threshold (${this.thresholds.maxAuthCheckTime}ms)`);
      recommendations.push('Optimize authentication check logic or implement caching');
    }

    if (this.currentSession.renderCount && 
        this.currentSession.renderCount > this.thresholds.maxRenderCount) {
      violations.push(`Render count (${this.currentSession.renderCount}) exceeds threshold (${this.thresholds.maxRenderCount})`);
      recommendations.push('Reduce unnecessary re-renders with React.memo or useMemo');
    }

    const errorRate = this.calculateErrorRate();
    if (errorRate > this.thresholds.maxErrorRate) {
      violations.push(`Error rate (${(errorRate * 100).toFixed(1)}%) exceeds threshold (${(this.thresholds.maxErrorRate * 100).toFixed(1)}%)`);
      recommendations.push('Improve error handling and reduce authentication failures');
    }

    return {
      isValid: violations.length === 0,
      violations,
      recommendations,
    };
  }

  /**
   * Calculates error rate from historical data
   */
  private calculateErrorRate(): number {
    if (this.metrics.length === 0) return 0;

    const totalErrors = this.metrics.reduce((sum, metric) => sum + metric.errorCount, 0);
    const totalSessions = this.metrics.length;

    return totalErrors / totalSessions;
  }

  /**
   * Gets performance statistics
   */
  getStatistics(): {
    averageHydrationTime: number;
    averageAuthCheckTime: number;
    averageRenderCount: number;
    errorRate: number;
    totalSessions: number;
  } {
    if (this.metrics.length === 0) {
      return {
        averageHydrationTime: 0,
        averageAuthCheckTime: 0,
        averageRenderCount: 0,
        errorRate: 0,
        totalSessions: 0,
      };
    }

    const totalHydrationTime = this.metrics.reduce((sum, metric) => sum + metric.hydrationDuration, 0);
    const totalAuthCheckTime = this.metrics.reduce((sum, metric) => sum + metric.authCheckDuration, 0);
    const totalRenderCount = this.metrics.reduce((sum, metric) => sum + metric.renderCount, 0);
    const totalErrors = this.metrics.reduce((sum, metric) => sum + metric.errorCount, 0);

    return {
      averageHydrationTime: totalHydrationTime / this.metrics.length,
      averageAuthCheckTime: totalAuthCheckTime / this.metrics.length,
      averageRenderCount: totalRenderCount / this.metrics.length,
      errorRate: totalErrors / this.metrics.length,
      totalSessions: this.metrics.length,
    };
  }

  /**
   * Updates performance thresholds
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  /**
   * Clears all metrics (useful for testing)
   */
  clearMetrics(): void {
    this.metrics = [];
    this.currentSession = {};
  }

  /**
   * Exports metrics for analysis
   */
  exportMetrics(): HydrationMetrics[] {
    return [...this.metrics];
  }
}

/**
 * React hook for performance monitoring
 */
export function useHydrationPerformance() {
  const validator = HydrationValidator.getInstance();

  const startSession = () => validator.startHydration();
  const endSession = () => validator.endHydration();
  const recordRender = () => validator.incrementRenderCount();
  const recordError = () => validator.recordError();
  const recordRetry = () => validator.recordRetry();
  const completeSession = () => validator.completeSession();
  const validatePerformance = () => validator.validatePerformance();
  const getStatistics = () => validator.getStatistics();

  return {
    startSession,
    endSession,
    recordRender,
    recordError,
    recordRetry,
    completeSession,
    validatePerformance,
    getStatistics,
  };
}

// Export singleton instance
export const hydrationValidator = HydrationValidator.getInstance();