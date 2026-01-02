import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { commitPhoto } from '@seloger/media'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: listingId } = await params

    // Verify ownership
    const { data: listing } = await supabase
        .from('listings')
        .select('owner_id')
        .eq('id', listingId)
        .single()

    if (!listing || listing.owner_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const json = await request.json()
    const { storagePath } = json

    const { data, error } = await commitPhoto(supabase, listingId, storagePath)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
}
