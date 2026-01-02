import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { CreateListingSchema } from '@seloger/listings'

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await request.json()
    const validation = CreateListingSchema.safeParse(json)

    if (!validation.success) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { data, error } = await supabase
        .from('listings')
        .insert({
            ...validation.data,
            status: 'published', // Force publish for MVP simplicity
            location: `POINT(${json.lng} ${json.lat})`, // Construct PostGIS point
            owner_id: user.id
        })
        .select()
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
}
