import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { UpdateListingSchema, updateListing } from '@seloger/listings'
import { sanitizeHtml, sanitizeText, stripUnknownFields } from '@/lib/validation'
import { withAuthAndRateLimit, withRateLimit, RATE_LIMITS } from '@/lib/api-middleware'

// Allowed fields for listing update
const ALLOWED_UPDATE_FIELDS = [
    'title',
    'op_type',
    'price',
    'rooms',
    'surface',
    'description',
    'status',
    'lat',
    'lng',
] as const

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    
    return withRateLimit(
        request,
        RATE_LIMITS.READ,
        async (req, context) => {
            const supabase = await createClient()

    const { data, error } = await supabase
        .from('listings')
        .select('*, owner_id, profiles(full_name, phone)') // minimal join
        .eq('id', id)
        .single()

    if (error) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(data)
        }
    )
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    
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
                json = stripUnknownFields(json as Record<string, unknown>, ALLOWED_UPDATE_FIELDS)
            }

    // Extract lat/lng if present for location update
            const { lat, lng, ...rest } = json as Record<string, unknown>
            const updateData = { ...rest } as Record<string, unknown>
    if (lat !== undefined && lng !== undefined) {
        updateData.lat = lat
        updateData.lng = lng
    }

    const validation = UpdateListingSchema.safeParse(updateData)

    if (!validation.success) {
                // Return validation errors without exposing internal details
                const errors = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }))
                return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 })
    }

            // Sanitize text fields if present
            const sanitizedData = {
                ...validation.data,
                ...(validation.data.title && { title: sanitizeText(validation.data.title) }),
                ...(validation.data.description && {
                    description: sanitizeHtml(validation.data.description)
                }),
            }

            const { data, error } = await updateListing(supabase, id, userId, sanitizedData)

    if (error) {
                // Don't expose internal error messages
                const { logger } = await import('@/lib/logger')
                logger.error('Database error updating listing', error, { userId, listingId: id })
                
                // Check if it's a forbidden error (ownership check)
                if (error.message === 'Forbidden') {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
                }
                
                return NextResponse.json(
                    { error: 'Failed to update listing' },
                    { status: 500 }
                )
    }

    return NextResponse.json(data)
        }
    )
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    
    return withAuthAndRateLimit(
        request,
        RATE_LIMITS.WRITE,
        async (req, userId) => {
            const supabase = await createClient()

            // Check if user is admin
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single()

            const isAdmin = profile?.role === 'admin'

            // If not admin, verify ownership
            if (!isAdmin) {
                const { data: listing } = await supabase
                    .from('listings')
                    .select('owner_id')
                    .eq('id', id)
                    .single()

                if (!listing || listing.owner_id !== userId) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
                }
            }

            // Check if listing exists
            const { data: listing } = await supabase
                .from('listings')
                .select('id')
                .eq('id', id)
                .single()

            if (!listing) {
                return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
            }

            // Delete the listing (RLS will handle permissions)
            // For admins: RLS policy allows deletion
            // For owners: RLS policy allows deletion of their own listings
            const { error } = await supabase
                .from('listings')
                .delete()
                .eq('id', id)

            if (error) {
                const { logger } = await import('@/lib/logger')
                logger.error('Delete listing error', error, { userId, listingId: id, isAdmin })
                return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 })
            }

            return NextResponse.json({ success: true, deleted: true })
        }
    )
}
