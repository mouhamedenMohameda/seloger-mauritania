import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
