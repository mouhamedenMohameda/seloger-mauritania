import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const SearchFiltersSchema = z.object({
    minLng: z.coerce.number(),
    minLat: z.coerce.number(),
    maxLng: z.coerce.number(),
    maxLat: z.coerce.number(),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
    minRooms: z.coerce.number().optional(),
});

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

export async function searchListings(
    client: SupabaseClient,
    filters: SearchFilters
) {
    // Call the Postgres RPC function
    return client.rpc('search_listings', {
        min_lng: filters.minLng,
        min_lat: filters.minLat,
        max_lng: filters.maxLng,
        max_lat: filters.maxLat,
        min_price: filters.minPrice,
        max_price: filters.maxPrice,
        min_rooms: filters.minRooms,
    });
}
