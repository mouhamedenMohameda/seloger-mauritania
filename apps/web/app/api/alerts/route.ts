import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { withAuthAndRateLimit, RATE_LIMITS } from '@/lib/api-middleware'
import { z } from 'zod'

const CreateAlertSchema = z.object({
    name: z.string().min(1).max(100),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    minRooms: z.number().int().nonnegative().optional(),
    maxRooms: z.number().int().nonnegative().optional(),
    minSurface: z.number().positive().optional(),
    maxSurface: z.number().positive().optional(),
    opType: z.enum(['rent', 'sell']).optional(),
    neighborhood: z.string().optional(),
    centerLat: z.number().min(-90).max(90).optional(),
    centerLng: z.number().min(-180).max(180).optional(),
    radiusKm: z.number().positive().max(50).default(5).optional(),
    emailNotifications: z.boolean().default(true).optional(),
    active: z.boolean().default(true).optional(),
}).refine(
    (data) => {
        // If centerLat is provided, centerLng must also be provided
        if (data.centerLat !== undefined || data.centerLng !== undefined) {
            return data.centerLat !== undefined && data.centerLng !== undefined
        }
        return true
    },
    { message: 'Both centerLat and centerLng must be provided together' }
)

export async function GET(request: Request) {
    return withAuthAndRateLimit(
        request,
        RATE_LIMITS.READ,
        async (req, context) => {
            const supabase = await createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }

            const { searchParams } = new URL(req.url)
            const activeOnly = searchParams.get('active') === 'true'

            let query = supabase
                .from('search_alerts')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (activeOnly) {
                query = query.eq('active', true)
            }

            const { data, error } = await query

            if (error) {
                const { logger } = await import('@/lib/logger')
                logger.error('Get alerts error', error, { userId: user.id })
                return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
            }

            return NextResponse.json({ data: data || [] })
        }
    )
}

export async function POST(request: Request) {
    return withAuthAndRateLimit(
        request,
        RATE_LIMITS.WRITE,
        async (req, context) => {
            const supabase = await createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }

            const body = await req.json()
            const validation = CreateAlertSchema.safeParse(body)

            if (!validation.success) {
                return NextResponse.json(
                    { error: 'Invalid alert data', details: validation.error.errors },
                    { status: 400 }
                )
            }

            const { data: alert, error } = await supabase
                .from('search_alerts')
                .insert({
                    user_id: user.id,
                    name: validation.data.name,
                    min_price: validation.data.minPrice,
                    max_price: validation.data.maxPrice,
                    min_rooms: validation.data.minRooms,
                    max_rooms: validation.data.maxRooms,
                    min_surface: validation.data.minSurface,
                    max_surface: validation.data.maxSurface,
                    op_type: validation.data.opType,
                    neighborhood: validation.data.neighborhood,
                    center_lat: validation.data.centerLat,
                    center_lng: validation.data.centerLng,
                    radius_km: validation.data.radiusKm || 5,
                    email_notifications: validation.data.emailNotifications ?? true,
                    active: validation.data.active ?? true,
                })
                .select()
                .single()

            if (error) {
                const { logger } = await import('@/lib/logger')
                logger.error('Create alert error', error, { userId: user.id })
                return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
            }

            return NextResponse.json({ data: alert })
        }
    )
}

