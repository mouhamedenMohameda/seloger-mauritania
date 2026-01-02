import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { UpdateListingSchema, updateListing } from '@seloger/listings'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient()
    const { id } = await params

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

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const json = await request.json()

    // Extract lat/lng if present for location update
    const { lat, lng, ...rest } = json
    const updateData = { ...rest }
    if (lat !== undefined && lng !== undefined) {
        updateData.lat = lat
        updateData.lng = lng
    }

    const validation = UpdateListingSchema.safeParse(updateData)

    if (!validation.success) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { data, error } = await updateListing(supabase, id, user.id, validation.data)

    if (error) {
        return NextResponse.json({ error: error.message || 'Failed to update listing' }, { status: 403 })
    }

    return NextResponse.json(data)
}
