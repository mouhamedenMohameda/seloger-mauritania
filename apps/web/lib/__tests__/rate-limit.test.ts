import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '../rate-limit';

describe('Rate Limit Utilities', () => {
    describe('getClientIdentifier', () => {
        it('should return user ID identifier if provided', () => {
            const request = new Request('http://localhost');
            expect(getClientIdentifier(request, 'user123')).toBe('user:user123');
        });

        it('should return IP identifier if user ID is not provided', () => {
            const request = new Request('http://localhost', {
                headers: { 'x-forwarded-for': '1.2.3.4' }
            });
            expect(getClientIdentifier(request)).toBe('ip:1.2.3.4');
        });

        it('should return unknown if no IP found', () => {
            const request = new Request('http://localhost');
            expect(getClientIdentifier(request)).toBe('ip:unknown');
        });
    });

    describe('checkRateLimit', () => {
        const config = { windowMs: 1000, maxRequests: 2 };
        const id = 'test-id';

        beforeEach(() => {
            vi.useFakeTimers();
        });

        it('should allow first requests', () => {
            const res1 = checkRateLimit(id, config);
            expect(res1.allowed).toBe(true);
            expect(res1.remaining).toBe(1);

            const res2 = checkRateLimit(id, config);
            expect(res2.allowed).toBe(true);
            expect(res2.remaining).toBe(0);
        });

        it('should block requests over limit', () => {
            checkRateLimit(id, config);
            checkRateLimit(id, config);
            const res3 = checkRateLimit(id, config);
            expect(res3.allowed).toBe(false);
            expect(res3.remaining).toBe(0);
        });

        it('should reset after windowMs', () => {
            checkRateLimit(id, config);
            checkRateLimit(id, config);

            vi.advanceTimersByTime(1001);

            const res3 = checkRateLimit(id, config);
            expect(res3.allowed).toBe(true);
            expect(res3.remaining).toBe(1);
        });

        it('should use separate counts for different identifiers', () => {
            checkRateLimit('user1', config);
            checkRateLimit('user1', config);
            expect(checkRateLimit('user1', config).allowed).toBe(false);

            expect(checkRateLimit('user2', config).allowed).toBe(true);
        });

        it('should handle zero maxRequests (deny all)', () => {
            const zeroConfig = { windowMs: 1000, maxRequests: 0 };
            expect(checkRateLimit('test-zero', zeroConfig).allowed).toBe(false);
        });
    });

    describe('Identification Logic', () => {
        it('should prioritize x-forwarded-for first part', () => {
            const req = new Request('http://h', {
                headers: { 'x-forwarded-for': '1.1.1.1, 2.2.2.2' }
            });
            expect(getClientIdentifier(req)).toBe('ip:1.1.1.1');
        });

        it('should fallback to x-real-ip', () => {
            const req = new Request('http://h', {
                headers: { 'x-real-ip': '3.3.3.3' }
            });
            expect(getClientIdentifier(req)).toBe('ip:3.3.3.3');
        });

        it('should handle many IPs in x-forwarded-for', () => {
            const req = new Request('http://h', {
                headers: { 'x-forwarded-for': 'a, b, c, d' }
            });
            expect(getClientIdentifier(req)).toBe('ip:a');
        });
    });

    describe('Memory Storage & Windows', () => {
        it('should store data per identity AND window size', () => {
            const c1 = { windowMs: 1000, maxRequests: 10 };
            const c2 = { windowMs: 2000, maxRequests: 10 };
            checkRateLimit('u1', c1);
            const res1 = checkRateLimit('u1', c1);
            expect(res1.remaining).toBe(8);

            const res2 = checkRateLimit('u1', c2);
            expect(res2.remaining).toBe(9);
        });
    });

    describe('Predefined Limits Verification', () => {
        it('WRITE limit should be 10/min', () => {
            expect(RATE_LIMITS.WRITE.maxRequests).toBe(10);
            expect(RATE_LIMITS.WRITE.windowMs).toBe(60000);
        });

        it('READ limit should be 60/min', () => {
            expect(RATE_LIMITS.READ.maxRequests).toBe(60);
        });

        it('AUTH limit should be strictly 5/15min', () => {
            expect(RATE_LIMITS.AUTH.maxRequests).toBe(5);
        });

        it('UPLOAD limit should be 5/min', () => {
            expect(RATE_LIMITS.UPLOAD.maxRequests).toBe(5);
        });
    });

    describe('Rate Limit Robustness', () => {
        it('should handle large windowMs', () => {
            const config = { windowMs: 24 * 60 * 60 * 1000, maxRequests: 5 };
            expect(checkRateLimit('long', config).allowed).toBe(true);
        });

        it('should handle small windowMs', () => {
            const config = { windowMs: 1, maxRequests: 5 };
            expect(checkRateLimit('short', config).allowed).toBe(true);
        });

        it('should work with different namespaces', () => {
            const config = { windowMs: 1000, maxRequests: 1 };
            checkRateLimit('a', config);
            expect(checkRateLimit('b', config).allowed).toBe(true);
        });

        it('should block multiple rapid requests with maxRequests: 1', () => {
            const config = { windowMs: 10000, maxRequests: 1 };
            checkRateLimit('rapid', config);
            expect(checkRateLimit('rapid', config).allowed).toBe(false);
        });
    });
});
