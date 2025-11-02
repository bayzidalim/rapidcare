// Comprehensive logging system for booking form debugging

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory = 'form' | 'validation' | 'api' | 'payment' | 'transformation' | 'retry' | 'user';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  stackTrace?: string;
  sessionId: string;
  userId?: number;
  context?: Record<string, any>;
}

export interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  categories: LogCategory[];
  maxEntries: number;
  persistToStorage: boolean;
  sendToServer: boolean;
}

class BookingLogger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private sessionId: string;
  private userId?: number;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      enabled: process.env.NODE_ENV === 'development',
      level: 'debug',
      categories: ['form', 'validation', 'api', 'payment', 'transformation', 'retry', 'user'],
      maxEntries: 1000,
      persistToStorage: true,
      sendToServer: false,
      ...config
    };

    this.sessionId = this.generateSessionId();
    this.loadFromStorage();
  }

  private generateSessionId(): string {
    return `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldLog(level: LogLevel, category: LogCategory): boolean {
    if (!this.config.enabled) return false;
    if (!this.config.categories.includes(category)) return false;

    const levelPriority = { debug: 0, info: 1, warn: 2, error: 3 };
    return levelPriority[level] >= levelPriority[this.config.level];
  }

  private createLogEntry(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: any,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: data ? this.sanitizeData(data) : undefined,
      stackTrace: error?.stack,
      sessionId: this.sessionId,
      userId: this.userId,
      context: {
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        timestamp: Date.now()
      }
    };
  }

  private sanitizeData(data: any): any {
    if (!data) return data;

    // Remove sensitive information
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    
    if (typeof data === 'object') {
      const sanitized = { ...data };
      
      for (const key in sanitized) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object') {
          sanitized[key] = this.sanitizeData(sanitized[key]);
        }
      }
      
      return sanitized;
    }
    
    return data;
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Maintain max entries limit
    if (this.logs.length > this.config.maxEntries) {
      this.logs = this.logs.slice(-this.config.maxEntries);
    }

    // Console output with formatting
    this.outputToConsole(entry);

    // Persist to storage
    if (this.config.persistToStorage) {
      this.saveToStorage();
    }

    // Send to server (if configured)
    if (this.config.sendToServer && entry.level === 'error') {
      this.sendToServer(entry);
    }
  }

  private outputToConsole(entry: LogEntry): void {
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌'
    };

    const categoryEmoji = {
      form: '📝',
      validation: '✅',
      api: '🌐',
      payment: '💳',
      transformation: '🔄',
      retry: '🔁',
      user: '👤'
    };

    const prefix = `${emoji[entry.level]} ${categoryEmoji[entry.category]} [${entry.category.toUpperCase()}]`;
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    
    const consoleMethod = entry.level === 'error' ? 'error' : 
                         entry.level === 'warn' ? 'warn' : 
                         entry.level === 'info' ? 'info' : 'log';

    console.group(`${prefix} ${entry.message} (${timestamp})`);
    
    if (entry.data) {
      console.log('Data:', entry.data);
    }
    
    if (entry.stackTrace) {
      console.log('Stack Trace:', entry.stackTrace);
    }
    
    if (entry.context) {
      console.log('Context:', entry.context);
    }
    
    console.groupEnd();
  }

  private saveToStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const recentLogs = this.logs.slice(-100); // Keep only recent 100 logs in storage
        localStorage.setItem('booking_logs', JSON.stringify(recentLogs));
      }
    } catch (error) {
      console.warn('Failed to save logs to storage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('booking_logs');
        if (stored) {
          const parsedLogs = JSON.parse(stored);
          this.logs = Array.isArray(parsedLogs) ? parsedLogs : [];
        }
      }
    } catch (error) {
      console.warn('Failed to load logs from storage:', error);
    }
  }

  private async sendToServer(entry: LogEntry): Promise<void> {
    try {
      // This would send logs to a logging service
      // Implementation depends on your backend logging setup
      console.log('Would send to server:', entry);
    } catch (error) {
      console.warn('Failed to send log to server:', error);
    }
  }

  // Public logging methods
  debug(category: LogCategory, message: string, data?: any): void {
    if (this.shouldLog('debug', category)) {
      this.addLog(this.createLogEntry('debug', category, message, data));
    }
  }

  info(category: LogCategory, message: string, data?: any): void {
    if (this.shouldLog('info', category)) {
      this.addLog(this.createLogEntry('info', category, message, data));
    }
  }

  warn(category: LogCategory, message: string, data?: any): void {
    if (this.shouldLog('warn', category)) {
      this.addLog(this.createLogEntry('warn', category, message, data));
    }
  }

  error(category: LogCategory, message: string, data?: any, error?: Error): void {
    if (this.shouldLog('error', category)) {
      this.addLog(this.createLogEntry('error', category, message, data, error));
    }
  }

  // Specialized logging methods for booking flow
  logFormSubmission(formData: any): void {
    this.info('form', 'Form submission started', {
      patientName: formData.patientName,
      resourceType: formData.resourceType,
      urgency: formData.urgency,
      hospitalId: formData.hospitalId,
      estimatedDuration: formData.estimatedDuration
    });
  }

  logValidationResult(isValid: boolean, errors: string[], warnings: string[] = []): void {
    if (isValid) {
      this.info('validation', 'Validation passed', { warnings });
    } else {
      this.error('validation', 'Validation failed', { errors, warnings });
    }
  }

  logApiCall(method: string, url: string, data?: any): void {
    this.info('api', `API call: ${method} ${url}`, { requestData: data });
  }

  logApiResponse(method: string, url: string, status: number, data?: any, error?: Error): void {
    if (error || status >= 400) {
      this.error('api', `API error: ${method} ${url}`, { status, responseData: data }, error);
    } else {
      this.info('api', `API success: ${method} ${url}`, { status, responseData: data });
    }
  }

  logPaymentStep(step: string, data?: any): void {
    this.info('payment', `Payment step: ${step}`, data);
  }

  logTransformation(success: boolean, inputData?: any, outputData?: any, error?: string): void {
    if (success) {
      this.info('transformation', 'Data transformation successful', { inputData, outputData });
    } else {
      this.error('transformation', 'Data transformation failed', { inputData, error });
    }
  }

  logRetryAttempt(attempt: number, maxAttempts: number, error?: Error): void {
    this.warn('retry', `Retry attempt ${attempt}/${maxAttempts}`, { error: error?.message });
  }

  logUserAction(action: string, data?: any): void {
    this.info('user', `User action: ${action}`, data);
  }

  // Utility methods
  setUserId(userId: number): void {
    this.userId = userId;
    this.info('user', 'User ID set', { userId });
  }

  getLogs(category?: LogCategory, level?: LogLevel): LogEntry[] {
    let filteredLogs = this.logs;

    if (category) {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }

    if (level) {
      const levelPriority = { debug: 0, info: 1, warn: 2, error: 3 };
      filteredLogs = filteredLogs.filter(log => levelPriority[log.level] >= levelPriority[level]);
    }

    return filteredLogs;
  }

  getLogsSummary(): { total: number; byLevel: Record<LogLevel, number>; byCategory: Record<LogCategory, number> } {
    const summary = {
      total: this.logs.length,
      byLevel: { debug: 0, info: 0, warn: 0, error: 0 } as Record<LogLevel, number>,
      byCategory: { form: 0, validation: 0, api: 0, payment: 0, transformation: 0, retry: 0, user: 0 } as Record<LogCategory, number>
    };

    this.logs.forEach(log => {
      summary.byLevel[log.level]++;
      summary.byCategory[log.category]++;
    });

    return summary;
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  clearLogs(): void {
    this.logs = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('booking_logs');
    }
    this.info('user', 'Logs cleared');
  }

  // Performance monitoring
  startTimer(name: string): () => void {
    const startTime = performance.now();
    this.debug('user', `Timer started: ${name}`);
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.info('user', `Timer completed: ${name}`, { duration: `${duration.toFixed(2)}ms` });
    };
  }
}

// Create singleton instance
export const bookingLogger = new BookingLogger();

// Export convenience functions
export const logFormSubmission = (formData: any) => bookingLogger.logFormSubmission(formData);
export const logValidationResult = (isValid: boolean, errors: string[], warnings?: string[]) => 
  bookingLogger.logValidationResult(isValid, errors, warnings);
export const logApiCall = (method: string, url: string, data?: any) => 
  bookingLogger.logApiCall(method, url, data);
export const logApiResponse = (method: string, url: string, status: number, data?: any, error?: Error) => 
  bookingLogger.logApiResponse(method, url, status, data, error);
export const logPaymentStep = (step: string, data?: any) => bookingLogger.logPaymentStep(step, data);
export const logTransformation = (success: boolean, inputData?: any, outputData?: any, error?: string) => 
  bookingLogger.logTransformation(success, inputData, outputData, error);
export const logRetryAttempt = (attempt: number, maxAttempts: number, error?: Error) => 
  bookingLogger.logRetryAttempt(attempt, maxAttempts, error);
export const logUserAction = (action: string, data?: any) => bookingLogger.logUserAction(action, data);

export default bookingLogger;