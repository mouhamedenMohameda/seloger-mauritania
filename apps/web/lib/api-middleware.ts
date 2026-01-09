/**
 * API middleware utilities for security
 */

import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from './rate-limit';
import { createClient } from './supabase/server';

export interface ApiContext {
    userId?: string;
    ip: string;
}

/**
 * Rate limit middleware wrapper
 */
export async function withRateLimit(
    request: Request,
    config: { windowMs: number; maxRequests: number },
    handler: (request: Request, context: ApiContext) => Promise<NextResponse>
): Promise<NextResponse> {
    // Get user ID if authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const identifier = getClientIdentifier(request, user?.id);
    const rateLimit = checkRateLimit(identifier, config);

    if (!rateLimit.allowed) {
        return NextResponse.json(
            {
                error: 'Too many requests',
                message: 'Rate limit exceeded. Please try again later.',
            },
            {
                status: 429,
                headers: {
                    'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
                    'X-RateLimit-Limit': config.maxRequests.toString(),
                    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
                    'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
                },
            }
        );
    }

    const context: ApiContext = {
        userId: user?.id,
        ip: identifier,
    };

    const response = await handler(request, context);
    
    // Add rate limit headers to response
    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());

    return response;
}

/**
 * Require authentication middleware
 */
export async function requireAuth(
    request: Request,
    handler: (request: Request, userId: string) => Promise<NextResponse>
): Promise<NextResponse> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return handler(request, user.id);
}

/**
 * Combined middleware: rate limit + auth
 */
export async function withAuthAndRateLimit(
    request: Request,
    rateLimitConfig: { windowMs: number; maxRequests: number },
    handler: (request: Request, userId: string) => Promise<NextResponse>
): Promise<NextResponse> {
    return withRateLimit(request, rateLimitConfig, async (req, context) => {
        if (!context.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return handler(req, context.userId);
    });
}

// Re-export RATE_LIMITS for convenience
export { RATE_LIMITS } from './rate-limit';

