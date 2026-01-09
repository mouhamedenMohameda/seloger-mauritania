import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { searchListings, SearchFiltersSchema } from '@seloger/geo'
import { withRateLimit, RATE_LIMITS } from '@/lib/api-middleware'

export async function GET(request: Request) {
    return withRateLimit(
        request,
        RATE_LIMITS.READ,
        async (req, context) => {
            const { searchParams } = new URL(req.url)

            const filtersRaw = {
                minLng: searchParams.get('bbox')?.split(',')[0],
                minLat: searchParams.get('bbox')?.split(',')[1],
                maxLng: searchParams.get('bbox')?.split(',')[2],
                maxLat: searchParams.get('bbox')?.split(',')[3],
                q: searchParams.get('q') || undefined,
                minPrice: searchParams.get('minPrice') || undefined,
                maxPrice: searchParams.get('maxPrice') || undefined,
                minRooms: searchParams.get('minRooms') || undefined,
                maxRooms: searchParams.get('maxRooms') || undefined,
                minSurface: searchParams.get('minSurface') || undefined,
                maxSurface: searchParams.get('maxSurface') || undefined,
                opType: searchParams.get('opType') || undefined,
                sortBy: searchParams.get('sortBy') || 'date_desc',
                // Pagination - REQUIRED (defaults provided by schema)
                limit: searchParams.get('limit') || '50',
                offset: searchParams.get('offset') || '0',
            }

            const validation = SearchFiltersSchema.safeParse(filtersRaw)

            if (!validation.success) {
                return NextResponse.json({ error: 'Invalid filters', details: validation.error.errors }, { status: 400 })
            }

            const supabase = await createClient()
            const { data, error } = await searchListings(supabase, validation.data)

            if (error) {
                const { logger } = await import('@/lib/logger')
                logger.error('Search listings error', error, { ip: context.ip })
                return NextResponse.json({ error: 'Failed to search listings' }, { status: 500 })
            }

            // Return paginated response with metadata
            return NextResponse.json({
                data: data || [],
                pagination: {
                    limit: validation.data.limit,
                    offset: validation.data.offset,
                    count: data?.length || 0,
                },
            })
        }
    )
}
