import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { withAuthAndRateLimit, RATE_LIMITS } from '@/lib/api-middleware'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ listingId: string }> }
) {
    return withAuthAndRateLimit(
        request,
        RATE_LIMITS.READ,
        async (req, context) => {
            const supabase = await createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                return NextResponse.json({ favorited: false })
            }

            const { listingId } = await params

            const { data, error } = await supabase
                .from('favorites')
                .select('id')
                .eq('user_id', user.id)
                .eq('listing_id', listingId)
                .single()

            // If not found, it's not favorited (not an error)
            if (error && error.code !== 'PGRST116') {
                const { logger } = await import('@/lib/logger')
                logger.error('Check favorite error', error, { userId: user.id, listingId })
            }

            return NextResponse.json({ favorited: !!data })
        }
    )
}

