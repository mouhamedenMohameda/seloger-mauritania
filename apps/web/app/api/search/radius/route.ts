import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { searchListingsByRadius, RadiusSearchSchema } from '@seloger/geo'
import { withRateLimit, RATE_LIMITS } from '@/lib/api-middleware'

export async function GET(request: Request) {
    return withRateLimit(
        request,
        RATE_LIMITS.READ,
        async (req, context) => {
            const { searchParams } = new URL(req.url)

            const filtersRaw = {
                centerLat: searchParams.get('lat'),
                centerLng: searchParams.get('lng'),
                radiusKm: searchParams.get('radius') || '5',
                minPrice: searchParams.get('minPrice') || undefined,
                maxPrice: searchParams.get('maxPrice') || undefined,
                minRooms: searchParams.get('minRooms') || undefined,
                maxRooms: searchParams.get('maxRooms') || undefined,
                minSurface: searchParams.get('minSurface') || undefined,
                maxSurface: searchParams.get('maxSurface') || undefined,
                opType: searchParams.get('opType') || undefined,
                sortBy: searchParams.get('sortBy') || 'date_desc',
                limit: searchParams.get('limit') || '50',
                offset: searchParams.get('offset') || '0',
            }

            const validation = RadiusSearchSchema.safeParse(filtersRaw)

            if (!validation.success) {
                return NextResponse.json({ error: 'Invalid filters', details: validation.error.errors }, { status: 400 })
            }

            const supabase = await createClient()
            const { data, error } = await searchListingsByRadius(supabase, validation.data)

            if (error) {
                const { logger } = await import('@/lib/logger')
                logger.error('Radius search error', error, { ip: context.ip })
                return NextResponse.json({ error: 'Failed to search listings' }, { status: 500 })
            }

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

