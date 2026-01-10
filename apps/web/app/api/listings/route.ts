import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { CreateListingSchema } from '@seloger/listings'
import { sanitizeHtml, sanitizeText, createPostGISPoint, stripUnknownFields } from '@/lib/validation'
import { withAuthAndRateLimit, withRateLimit, RATE_LIMITS } from '@/lib/api-middleware'

// Allowed fields for listing creation
const ALLOWED_CREATE_FIELDS = [
    'title',
    'op_type',
    'price',
    'rooms',
    'surface',
    'description',
    'lat',
    'lng',
] as const

export async function GET(request: Request) {
    return withRateLimit(
        request,
        RATE_LIMITS.READ,
        async (req, context) => {
            const supabase = await createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }

            const { searchParams } = new URL(req.url)

            // Pagination - REQUIRED
            const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Max 100
            const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

            const { data, error, count } = await supabase
                .from('listings')
                .select('*', { count: 'exact' })
                .eq('owner_id', user.id)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1)

            if (error) {
                const { logger } = await import('@/lib/logger')
                logger.error('List listings error', error, { userId: user.id })
                return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 })
            }

            return NextResponse.json({
                data: data || [],
                pagination: {
                    limit,
                    offset,
                    count: data?.length || 0,
                    total: count || 0,
                },
            })
        }
    )
}

export async function POST(request: Request) {
    return withAuthAndRateLimit(
        request,
        RATE_LIMITS.WRITE,
        async (req, userId) => {
            const supabase = await createClient()

            let json: unknown
            try {
                json = await req.json()
            } catch (error) {
                return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
            }

            // Strip unknown fields to prevent injection
            if (typeof json === 'object' && json !== null) {
                json = stripUnknownFields(json as Record<string, unknown>, ALLOWED_CREATE_FIELDS)
            }

            // Validate with Zod schema
            const validation = CreateListingSchema.safeParse(json)

            if (!validation.success) {
                // Return validation errors without exposing internal details
                const errors = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }))
                return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 })
            }

            // Sanitize text fields
            const sanitizedData = {
                ...validation.data,
                title: sanitizeText(validation.data.title),
                description: validation.data.description
                    ? sanitizeHtml(validation.data.description)
                    : undefined,
            }

            // Create PostGIS point securely
            let location: string
            try {
                location = createPostGISPoint(validation.data.lat, validation.data.lng)
            } catch (error) {
                return NextResponse.json(
                    { error: 'Invalid coordinates' },
                    { status: 400 }
                )
            }

            // Extract lat/lng from sanitized data (they're not part of the DB schema)
            const { lat, lng, ...dbData } = sanitizedData

            // Insert listing with location using PostGIS RPC function
            const { data: rpcData, error: rpcError } = await supabase.rpc('create_listing_with_location', {
                p_title: dbData.title,
                p_op_type: dbData.op_type,
                p_price: dbData.price,
                p_rooms: dbData.rooms ?? null,
                p_surface: dbData.surface ?? null,
                p_description: dbData.description ?? null,
                p_lat: lat,
                p_lng: lng,
                p_owner_id: userId,
                p_status: 'published'
            })

            if (rpcError) {
                const { logger } = await import('@/lib/logger')
                logger.error('Database error creating listing', rpcError, { userId })
                
                // Check if the error is because the RPC function doesn't exist
                const isRpcNotFound = rpcError.message?.includes('not found') || 
                                     rpcError.message?.includes('Could not find') ||
                                     rpcError.message?.includes('does not exist')
                
                const isDev = process.env.NODE_ENV === 'development'
                
                if (isRpcNotFound) {
                    return NextResponse.json(
                        { 
                            error: 'Database function not found. Please apply the migration through Supabase Dashboard.',
                            migrationFile: 'supabase/migrations/20240101000010_create_listing_rpc.sql',
                            instructions: [
                                '1. Go to Supabase Dashboard > SQL Editor',
                                '2. Open the file: supabase/migrations/20240101000010_create_listing_rpc.sql',
                                '3. Copy and paste the entire content into SQL Editor',
                                '4. Click Run to execute the migration'
                            ],
                            details: isDev ? rpcError.message : undefined
                        },
                        { status: 500 }
                    )
                }
                
                return NextResponse.json(
                    { 
                        error: 'Failed to create listing',
                        details: isDev ? rpcError.message : undefined
                    },
                    { status: 500 }
                )
            }

            // RPC function returns TABLE, which is an array - extract first element
            if (!rpcData || !Array.isArray(rpcData) || rpcData.length === 0) {
                const { logger } = await import('@/lib/logger')
                logger.error('RPC returned empty result', { userId, data: rpcData })
                return NextResponse.json(
                    { error: 'Failed to create listing - no data returned' },
                    { status: 500 }
                )
            }

            return NextResponse.json(rpcData[0])
        }
    )
}
