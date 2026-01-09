import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { withAuthAndRateLimit, RATE_LIMITS } from '@/lib/api-middleware'
import { z } from 'zod'

const UpdateAlertSchema = z.object({
    name: z.string().min(1).max(100).optional(),
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
    radiusKm: z.number().positive().max(50).optional(),
    emailNotifications: z.boolean().optional(),
    active: z.boolean().optional(),
})

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    return withAuthAndRateLimit(
        request,
        RATE_LIMITS.WRITE,
        async (req, context) => {
            const supabase = await createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }

            const { id } = await params

            // Verify ownership
            const { data: existingAlert } = await supabase
                .from('search_alerts')
                .select('user_id')
                .eq('id', id)
                .single()

            if (!existingAlert || existingAlert.user_id !== user.id) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }

            const body = await req.json()
            const validation = UpdateAlertSchema.safeParse(body)

            if (!validation.success) {
                return NextResponse.json(
                    { error: 'Invalid alert data', details: validation.error.errors },
                    { status: 400 }
                )
            }

            const updateData: any = {}
            if (validation.data.name !== undefined) updateData.name = validation.data.name
            if (validation.data.minPrice !== undefined) updateData.min_price = validation.data.minPrice
            if (validation.data.maxPrice !== undefined) updateData.max_price = validation.data.maxPrice
            if (validation.data.minRooms !== undefined) updateData.min_rooms = validation.data.minRooms
            if (validation.data.maxRooms !== undefined) updateData.max_rooms = validation.data.maxRooms
            if (validation.data.minSurface !== undefined) updateData.min_surface = validation.data.minSurface
            if (validation.data.maxSurface !== undefined) updateData.max_surface = validation.data.maxSurface
            if (validation.data.opType !== undefined) updateData.op_type = validation.data.opType
            if (validation.data.neighborhood !== undefined) updateData.neighborhood = validation.data.neighborhood
            if (validation.data.centerLat !== undefined) updateData.center_lat = validation.data.centerLat
            if (validation.data.centerLng !== undefined) updateData.center_lng = validation.data.centerLng
            if (validation.data.radiusKm !== undefined) updateData.radius_km = validation.data.radiusKm
            if (validation.data.emailNotifications !== undefined) updateData.email_notifications = validation.data.emailNotifications
            if (validation.data.active !== undefined) updateData.active = validation.data.active

            const { data: alert, error } = await supabase
                .from('search_alerts')
                .update(updateData)
                .eq('id', id)
                .select()
                .single()

            if (error) {
                const { logger } = await import('@/lib/logger')
                logger.error('Update alert error', error, { userId: user.id, alertId: id })
                return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 })
            }

            return NextResponse.json({ data: alert })
        }
    )
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    return withAuthAndRateLimit(
        request,
        RATE_LIMITS.WRITE,
        async (req, context) => {
            const supabase = await createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }

            const { id } = await params

            // Verify ownership
            const { data: existingAlert } = await supabase
                .from('search_alerts')
                .select('user_id')
                .eq('id', id)
                .single()

            if (!existingAlert || existingAlert.user_id !== user.id) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }

            const { error } = await supabase
                .from('search_alerts')
                .delete()
                .eq('id', id)

            if (error) {
                const { logger } = await import('@/lib/logger')
                logger.error('Delete alert error', error, { userId: user.id, alertId: id })
                return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 })
            }

            return NextResponse.json({ message: 'Alert deleted' })
        }
    )
}

