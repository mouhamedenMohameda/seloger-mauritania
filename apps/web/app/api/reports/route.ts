import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createReport, CreateReportSchema } from '@seloger/moderation'

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await request.json()
    const validation = CreateReportSchema.safeParse(json)

    if (!validation.success) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { data, error } = await createReport(supabase, user.id, validation.data)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
}
