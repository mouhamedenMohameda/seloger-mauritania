import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createPresignedUploadUrl } from '@seloger/media'
import { v4 as uuidv4 } from 'uuid'

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
    const { fileName, fileType } = json // e.g. "image.jpg", "image/jpeg"

    const fileExt = fileName.split('.').pop()
    const storedFileName = `${uuidv4()}.${fileExt}` // random name

    const { data, error } = await createPresignedUploadUrl(
        supabase,
        listingId,
        user.id,
        storedFileName
    )

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ signedUrl: data.signedUrl, path: data.path })
}
