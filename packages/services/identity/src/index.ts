import { SupabaseClient } from '@supabase/supabase-js';

export interface Profile {
    id: string;
    role: 'user' | 'admin';
    full_name: string | null;
    phone: string | null;
    created_at: string;
}

export async function getProfile(client: SupabaseClient, userId: string) {
    return client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
}

export async function updateProfile(client: SupabaseClient, userId: string, updates: Partial<Profile>) {
    return client
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
}
