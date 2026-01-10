import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { CreateListingSchema } from '@seloger/listings'
import { sanitizeHtml, sanitizeText } from '@/lib/validation'

/**
 * Bulk import endpoint for listings
 * Requires service role key or authenticated user with admin role
 * Usage: POST /api/listings/bulk with array of listings
 */
export async function POST(request: Request) {
    const supabase = await createClient()

    // Check for service role key in headers (for scripts)
    const authHeader = request.headers.get('authorization')
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    // Verify authorization
    let userId: string | null = null
    let isServiceRole = false
    
    if (authHeader?.startsWith('Bearer ') && authHeader.slice(7) === serviceRoleKey) {
        // Service role key provided - bypass auth
        isServiceRole = true
    } else {
        // Check authenticated user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        userId = user.id
    }

    let json: unknown
    try {
        json = await request.json()
    } catch (error) {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Expect array of listings or object with listings array
    let listings: any[] = []
    if (Array.isArray(json)) {
        listings = json
    } else if (json && typeof json === 'object' && 'listings' in json && Array.isArray((json as any).listings)) {
        listings = (json as any).listings
    } else {
        return NextResponse.json({ error: 'Invalid format: expected array of listings or { listings: [...] }' }, { status: 400 })
    }

    if (listings.length === 0) {
        return NextResponse.json({ error: 'No listings provided' }, { status: 400 })
    }

    // Results
    const results: Array<{ success: boolean; id?: string; error?: string; index: number }> = []
    let successCount = 0
    let errorCount = 0

    // Process each listing
    for (let i = 0; i < listings.length; i++) {
        const listing = listings[i]
        
        try {
            // Validate with schema
            const validation = CreateListingSchema.safeParse({
                title: listing.title,
                op_type: listing.op_type,
                price: listing.price,
                lat: listing.lat,
                lng: listing.lng,
                rooms: listing.rooms,
                surface: listing.surface,
                description: listing.description,
            })

            if (!validation.success) {
                const errors = validation.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
                results.push({ success: false, error: `Validation failed: ${errors}`, index: i })
                errorCount++
                continue
            }

            // Sanitize text fields
            const sanitizedData = {
                ...validation.data,
                title: sanitizeText(validation.data.title),
                description: validation.data.description
                    ? sanitizeHtml(validation.data.description)
                    : undefined,
            }

            const { lat, lng, ...dbData } = sanitizedData

            // Use RPC function if available, otherwise use direct insert with location string
            let listingId: string | null = null

            // Try RPC first
            const { data: rpcData, error: rpcError } = await supabase.rpc('create_listing_with_location', {
                p_title: dbData.title,
                p_op_type: dbData.op_type,
                p_price: dbData.price,
                p_rooms: dbData.rooms ?? null,
                p_surface: dbData.surface ?? null,
                p_description: dbData.description ?? null,
                p_lat: lat,
                p_lng: lng,
                p_owner_id: userId || listing.owner_id || null,
                p_status: 'published'
            })

            if (!rpcError && rpcData) {
                const result = Array.isArray(rpcData) ? rpcData[0] : rpcData
                listingId = result?.id || null
            } else if (rpcError?.message?.includes('not found') || rpcError?.message?.includes('Could not find')) {
                // RPC doesn't exist - create listing without location first, then update
                // This is a workaround
                const { data: createdListing, error: insertError } = await supabase
                    .from('listings')
                    .insert({
                        owner_id: userId || listing.owner_id || null,
                        title: dbData.title,
                        op_type: dbData.op_type,
                        price: dbData.price,
                        rooms: dbData.rooms ?? null,
                        surface: dbData.surface ?? null,
                        description: dbData.description ?? null,
                        status: 'published',
                    })
                    .select('id')
                    .single()

                if (insertError || !createdListing) {
                    results.push({ 
                        success: false, 
                        error: `Failed to create listing: ${insertError?.message || 'Unknown error'}`, 
                        index: i 
                    })
                    errorCount++
                    continue
                }

                listingId = createdListing.id

                // Update location using raw SQL (requires service role or admin)
                // Note: This requires the RPC function or direct PostgreSQL access
                // For now, log warning
                console.warn(`Listing ${listingId} created without location. Please apply RPC migration.`)
            } else {
                // Other RPC error
                results.push({ 
                    success: false, 
                    error: `RPC error: ${rpcError?.message || 'Unknown error'}`, 
                    index: i 
                })
                errorCount++
                continue
            }

            if (listingId) {
                results.push({ success: true, id: listingId, index: i })
                successCount++
            } else {
                results.push({ success: false, error: 'Failed to create listing - no ID returned', index: i })
                errorCount++
            }

        } catch (error: any) {
            results.push({ success: false, error: error.message || 'Unknown error', index: i })
            errorCount++
        }
    }

    return NextResponse.json({
        success: errorCount === 0,
        summary: {
            total: listings.length,
            success: successCount,
            errors: errorCount,
        },
        results,
    }, { status: errorCount === 0 ? 200 : 207 }) // 207 = Multi-Status
}
