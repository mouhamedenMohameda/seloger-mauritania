import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { searchListings, SearchFiltersSchema } from '@seloger/geo'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)

    const filtersRaw = {
        minLng: searchParams.get('bbox')?.split(',')[0],
        minLat: searchParams.get('bbox')?.split(',')[1],
        maxLng: searchParams.get('bbox')?.split(',')[2],
        maxLat: searchParams.get('bbox')?.split(',')[3],
        minPrice: searchParams.get('minPrice') || undefined,
        maxPrice: searchParams.get('maxPrice') || undefined,
        minRooms: searchParams.get('minRooms') || undefined,
    }

    const validation = SearchFiltersSchema.safeParse(filtersRaw)

    if (!validation.success) {
        return NextResponse.json({ error: 'Invalid filters' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await searchListings(supabase, validation.data)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
}
