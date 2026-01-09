/**
 * Structured logging utility
 * For production, consider integrating with a logging service (e.g., Sentry, LogRocket)
 */

export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
}

export interface LogContext {
    userId?: string;
    ip?: string;
    path?: string;
    method?: string;
    [key: string]: unknown;
}

class Logger {
    private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
        const timestamp = new Date().toISOString();
        const contextStr = context ? JSON.stringify(context) : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message} ${contextStr}`;
    }

    private log(level: LogLevel, message: string, context?: LogContext): void {
        const formatted = this.formatMessage(level, message, context);
        
        switch (level) {
            case LogLevel.DEBUG:
                if (process.env.NODE_ENV === 'development') {
                    console.debug(formatted);
                }
                break;
            case LogLevel.INFO:
                console.info(formatted);
                break;
            case LogLevel.WARN:
                console.warn(formatted);
                break;
            case LogLevel.ERROR:
                console.error(formatted);
                // In production, send to error tracking service
                if (process.env.NODE_ENV === 'production') {
                    // TODO: Integrate with error tracking service (e.g., Sentry)
                }
                break;
        }
    }

    debug(message: string, context?: LogContext): void {
        this.log(LogLevel.DEBUG, message, context);
    }

    info(message: string, context?: LogContext): void {
        this.log(LogLevel.INFO, message, context);
    }

    warn(message: string, context?: LogContext): void {
        this.log(LogLevel.WARN, message, context);
    }

    error(message: string, error?: Error | unknown, context?: LogContext): void {
        const errorContext: LogContext = {
            ...context,
            error: error instanceof Error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
            } : error,
        };
        this.log(LogLevel.ERROR, message, errorContext);
    }
}

export const logger = new Logger();

