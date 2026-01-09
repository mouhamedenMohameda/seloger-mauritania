import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withRateLimit } from '../api-middleware';
import { NextResponse } from 'next/server';

// Mock supabase/server
vi.mock('../supabase/server', () => ({
    createClient: vi.fn().mockResolvedValue({
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null })
        }
    })
}));

// Mock next/server
vi.mock('next/server', () => ({
    NextResponse: {
        json: vi.fn((data, init) => ({
            json: async () => data,
            status: init?.status || 200,
            headers: new Map(Object.entries(init?.headers || {}))
        }))
    }
}));

describe('API Middleware', () => {
    it('withRateLimit should allow requests within limit', async () => {
        const req = new Request('http://localhost/api');
        const config = { windowMs: 60000, maxRequests: 10 };
        const handler = vi.fn().mockResolvedValue({
            headers: new Map()
        } as any);

        const response = await withRateLimit(req, config, handler);
        expect(handler).toHaveBeenCalled();
        expect(response.status).not.toBe(429);
    });

    it('withRateLimit should block requests over limit', async () => {
        const req = new Request('http://localhost/api');
        const config = { windowMs: 60000, maxRequests: 0 }; // 0 limit to force block
        const handler = vi.fn();

        const response = await withRateLimit(req, config, handler);
        expect(handler).not.toHaveBeenCalled();
        expect(response.status).toBe(429);
        const data = await response.json();
        expect(data.error).toBe('Too many requests');
    });
});
