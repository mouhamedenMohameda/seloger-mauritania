import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { withAuthAndRateLimit, RATE_LIMITS } from '@/lib/api-middleware'

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
            const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
            const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

            const { data, error, count } = await supabase
                .from('favorites')
                .select('*, listings(*, owner_id, profiles(full_name, phone))', { count: 'exact' })
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1)

            if (error) {
                const { logger } = await import('@/lib/logger')
                logger.error('Get favorites error', error, { userId: user.id })
                return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 })
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
        async (req, context) => {
            const supabase = await createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }

            const body = await req.json()
            const { listingId } = body

            if (!listingId || typeof listingId !== 'string') {
                return NextResponse.json({ error: 'Invalid listingId' }, { status: 400 })
            }

            // Check if listing exists and is published
            const { data: listing, error: listingError } = await supabase
                .from('listings')
                .select('id, status')
                .eq('id', listingId)
                .single()

            if (listingError || !listing) {
                return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
            }

            if (listing.status !== 'published') {
                return NextResponse.json({ error: 'Listing not available' }, { status: 400 })
            }

            // Insert favorite (ignore if already exists due to unique constraint)
            const { data, error } = await supabase
                .from('favorites')
                .insert({ user_id: user.id, listing_id: listingId })
                .select()
                .single()

            if (error) {
                // If already favorited, return success
                if (error.code === '23505') { // Unique violation
                    return NextResponse.json({ message: 'Already favorited', favorited: true })
                }
                const { logger } = await import('@/lib/logger')
                logger.error('Add favorite error', error, { userId: user.id, listingId })
                return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 })
            }

            return NextResponse.json({ message: 'Favorite added', favorited: true, data })
        }
    )
}

export async function DELETE(request: Request) {
    return withAuthAndRateLimit(
        request,
        RATE_LIMITS.WRITE,
        async (req, context) => {
            const supabase = await createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }

            const { searchParams } = new URL(req.url)
            const listingId = searchParams.get('listingId')

            if (!listingId) {
                return NextResponse.json({ error: 'listingId is required' }, { status: 400 })
            }

            const { error } = await supabase
                .from('favorites')
                .delete()
                .eq('user_id', user.id)
                .eq('listing_id', listingId)

            if (error) {
                const { logger } = await import('@/lib/logger')
                logger.error('Remove favorite error', error, { userId: user.id, listingId })
                return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 })
            }

            return NextResponse.json({ message: 'Favorite removed', favorited: false })
        }
    )
}

