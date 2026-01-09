import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, LogLevel } from '../logger';

describe('Logger Utility', () => {
    let consoleSpy: {
        info: any;
        warn: any;
        error: any;
        debug: any;
    };

    beforeEach(() => {
        consoleSpy = {
            info: vi.spyOn(console, 'info').mockImplementation(() => { }),
            warn: vi.spyOn(console, 'warn').mockImplementation(() => { }),
            error: vi.spyOn(console, 'error').mockImplementation(() => { }),
            debug: vi.spyOn(console, 'debug').mockImplementation(() => { }),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should log info messages', () => {
        logger.info('test info', { userId: '123' });
        expect(consoleSpy.info).toHaveBeenCalled();
        const callArgs = consoleSpy.info.mock.calls[0][0];
        expect(callArgs).toContain('[INFO]');
        expect(callArgs).toContain('test info');
        expect(callArgs).toContain('{"userId":"123"}');
    });

    it('should log warn messages', () => {
        logger.warn('test warn');
        expect(consoleSpy.warn).toHaveBeenCalled();
        expect(consoleSpy.warn.mock.calls[0][0]).toContain('[WARN]');
    });

    it('should log error messages with Error object', () => {
        const error = new Error('boom');
        logger.error('test error', error, { path: '/api' });
        expect(consoleSpy.error).toHaveBeenCalled();
        const callArgs = consoleSpy.error.mock.calls[0][0];
        expect(callArgs).toContain('[ERROR]');
        expect(callArgs).toContain('boom');
        expect(callArgs).toContain('"/api"');
    });

    it('should not log debug in non-dev environment', () => {
        vi.stubEnv('NODE_ENV', 'production');

        logger.debug('should not show');
        expect(consoleSpy.debug).not.toHaveBeenCalled();

        vi.unstubAllEnvs();
    });
});
