type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogPayload {
  message: string;
  timestamp: string;
  level: LogLevel;
  context?: string;
  [key: string]: any;
}

class StructuredLogger {
  private formatLog(level: LogLevel, message: string, meta?: Record<string, any>, context?: string): string {
    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
      ...meta,
    };
    return JSON.stringify(payload);
  }

  debug(message: string, meta?: Record<string, any>, context?: string): void {
    if ((import.meta as any).env?.DEV) {
      console.debug(this.formatLog('DEBUG', message, meta, context));
    }
  }

  info(message: string, meta?: Record<string, any>, context?: string): void {
    console.info(this.formatLog('INFO', message, meta, context));
  }

  warn(message: string, meta?: Record<string, any>, context?: string): void {
    console.warn(this.formatLog('WARN', message, meta, context));
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, any>, context?: string): void {
    const errorMeta = error instanceof Error ? {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
    } : { error };

    console.error(this.formatLog('ERROR', message, { ...errorMeta, ...meta }, context));
  }
}

export const logger = new StructuredLogger();
