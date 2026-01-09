import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { withRateLimit, RATE_LIMITS } from '@/lib/api-middleware'
import { sanitizeText } from '@/lib/validation'

export async function GET(request: Request) {
    return withRateLimit(
        request,
        RATE_LIMITS.READ,
        async (req, context) => {
            const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')
            
            // Pagination - REQUIRED
            const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50); // Max 50
            const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    if (!q || q.length < 2) {
                return NextResponse.json({
                    data: [],
                    pagination: { limit, offset, count: 0 },
                })
    }

            // Sanitize search query to prevent injection
            const sanitizedQuery = sanitizeText(q);

    const supabase = await createClient()

    const { data, error } = await supabase
        .from('listings')
                .select('id, title, description, price, op_type, location', { count: 'exact' })
        .eq('status', 'published')
                .or(`title.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`)
                .range(offset, offset + limit - 1)
                .order('created_at', { ascending: false })

    if (error) {
                const { logger } = await import('@/lib/logger')
                logger.error('Property search error', error, { ip: context.ip, query: sanitizedQuery })
                return NextResponse.json({ error: 'Failed to search listings' }, { status: 500 })
    }

            return NextResponse.json({
                data: data || [],
                pagination: {
                    limit,
                    offset,
                    count: data?.length || 0,
                    total: null, // Supabase count is not reliable with RLS, would need separate query
                },
            })
        }
    )
}
