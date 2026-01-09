/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or Upstash for distributed rate limiting
 */

interface RateLimitConfig {
    windowMs: number; // Time window in milliseconds
    maxRequests: number; // Maximum requests per window
}

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// In-memory store (clears on server restart)
// For production, use Redis or similar
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetTime < now) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Object with `allowed` boolean and `remaining` requests
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const key = `${identifier}:${config.windowMs}`;
    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
        // Create new entry or reset expired entry
        const resetTime = now + config.windowMs;
        const count = 1;
        rateLimitStore.set(key, {
            count,
            resetTime,
        });

        const allowed = count <= config.maxRequests;
        return {
            allowed,
            remaining: allowed ? config.maxRequests - count : 0,
            resetTime,
        };
    }

    // Increment count
    entry.count++;

    if (entry.count > config.maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetTime: entry.resetTime,
        };
    }

    return {
        allowed: true,
        remaining: config.maxRequests - entry.count,
        resetTime: entry.resetTime,
    };
}

/**
 * Get client identifier from request
 * Uses IP address or user ID if available
 */
export function getClientIdentifier(request: Request, userId?: string): string {
    // Prefer user ID if available (more accurate for authenticated users)
    if (userId) {
        return `user:${userId}`;
    }

    // Fallback to IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'unknown';

    return `ip:${ip}`;
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
    // Strict limits for write operations
    WRITE: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 10, // 10 requests per minute
    },
    // Moderate limits for read operations
    READ: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 60, // 60 requests per minute
    },
    // Very strict limits for authentication
    AUTH: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5, // 5 requests per 15 minutes
    },
    // Strict limits for file uploads
    UPLOAD: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 5, // 5 uploads per minute
    },
} as const;

