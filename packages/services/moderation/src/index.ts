import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const CreateReportSchema = z.object({
    listingId: z.string().uuid(),
    reason: z.string().min(10).max(500),
});

export type CreateReportInput = z.infer<typeof CreateReportSchema>;

export async function createReport(
    client: SupabaseClient,
    reporterId: string,
    input: CreateReportInput
) {
    return client
        .from('reports')
        .insert({
            listing_id: input.listingId,
            reporter_id: reporterId,
            reason: input.reason
        })
        .select()
        .single();
}

export async function adminUnpublishListing(
    client: SupabaseClient,
    listingId: string
) {
    // This relies on the RLS policy "Admins can update any listing"
    return client
        .from('listings')
        .update({ status: 'archived' })
        .eq('id', listingId)
        .select()
        .single();
}
