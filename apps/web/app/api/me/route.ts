import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getProfile, updateProfile } from '@seloger/identity'

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error } = await getProfile(supabase, user.id)

    if (error) {
        const { logger } = await import('@/lib/logger')
        logger.error('Profile fetch error', error, { userId: user.id })
        return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    return NextResponse.json({ user, profile })
}

export async function PATCH(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updates = await request.json()

    const { data, error } = await updateProfile(supabase, user.id, updates)

    if (error) {
        const { logger } = await import('@/lib/logger')
        logger.error('Profile update error', error, { userId: user.id })
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json(data)
}
