import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';

// Schemas
export const CreateListingSchema = z.object({
    title: z.string().min(5).max(100).optional(),
    op_type: z.enum(['rent', 'sell']).default('rent'),
    price: z.number().nonnegative().optional(),
    rooms: z.number().int().nonnegative().optional(),
    surface: z.number().nonnegative().optional(),
    description: z.string().max(1000).optional(),
});

export type CreateListingInput = z.infer<typeof CreateListingSchema>;

export const UpdateListingSchema = CreateListingSchema.partial().extend({
    status: z.enum(['draft', 'published', 'archived']).optional(),
});

// Service Methods
export async function createListing(client: SupabaseClient, userId: string, input: CreateListingInput) {
    return client
        .from('listings')
        .insert({ ...input, owner_id: userId })
        .select()
        .single();
}

export async function getListingById(client: SupabaseClient, id: string) {
    return client
        .from('listings')
        .select('*, owner_id, profiles(full_name, phone)')
        .eq('id', id)
        .single();
}
