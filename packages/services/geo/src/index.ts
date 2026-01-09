import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const SortOrderSchema = z.enum(['price_asc', 'price_desc', 'date_desc', 'date_asc', 'surface_desc', 'surface_asc']).default('date_desc');

export const SearchFiltersSchema = z.object({
    minLng: z.coerce.number(),
    minLat: z.coerce.number(),
    maxLng: z.coerce.number(),
    maxLat: z.coerce.number(),
    // Text search
    q: z.string().optional(),
    // Price filters
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
    // Room filters
    minRooms: z.coerce.number().optional(),
    maxRooms: z.coerce.number().optional(),
    // Surface filters
    minSurface: z.coerce.number().optional(),
    maxSurface: z.coerce.number().optional(),
    // Operation type filter
    opType: z.enum(['rent', 'sell']).optional(),
    // Sorting
    sortBy: SortOrderSchema,
    // Pagination - REQUIRED
    limit: z.coerce.number().int().positive().max(100).default(50), // Max 100 per page
    offset: z.coerce.number().int().nonnegative().default(0),
});

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

export const RadiusSearchSchema = z.object({
    centerLat: z.coerce.number().min(-90).max(90),
    centerLng: z.coerce.number().min(-180).max(180),
    radiusKm: z.coerce.number().positive().max(50).default(5), // Max 50km radius
    // Text search
    q: z.string().optional(),
    // Price filters
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
    // Room filters
    minRooms: z.coerce.number().optional(),
    maxRooms: z.coerce.number().optional(),
    // Surface filters
    minSurface: z.coerce.number().optional(),
    maxSurface: z.coerce.number().optional(),
    // Operation type filter
    opType: z.enum(['rent', 'sell']).optional(),
    // Sorting
    sortBy: SortOrderSchema,
    // Pagination - REQUIRED
    limit: z.coerce.number().int().positive().max(100).default(50),
    offset: z.coerce.number().int().nonnegative().default(0),
});

export type RadiusSearchFilters = z.infer<typeof RadiusSearchSchema>;

export async function searchListings(
    client: SupabaseClient,
    filters: SearchFilters
) {
    // Call the Postgres RPC function with pagination and filters
    return client.rpc('search_listings', {
        min_lng: filters.minLng,
        min_lat: filters.minLat,
        max_lng: filters.maxLng,
        max_lat: filters.maxLat,
        min_price: filters.minPrice,
        max_price: filters.maxPrice,
        min_rooms: filters.minRooms,
        max_rooms: filters.maxRooms,
        min_surface: filters.minSurface,
        max_surface: filters.maxSurface,
        op_type_filter: filters.opType,
        sort_order: filters.sortBy,
        limit_count: filters.limit,
        offset_count: filters.offset,
        query_text: filters.q,
    });
}

export async function searchListingsByRadius(
    client: SupabaseClient,
    filters: RadiusSearchFilters
) {
    // Call the Postgres RPC function for radius search
    return client.rpc('search_listings_by_radius', {
        center_lat: filters.centerLat,
        center_lng: filters.centerLng,
        radius_km: filters.radiusKm,
        min_price: filters.minPrice,
        max_price: filters.maxPrice,
        min_rooms: filters.minRooms,
        max_rooms: filters.maxRooms,
        min_surface: filters.minSurface,
        max_surface: filters.maxSurface,
        op_type_filter: filters.opType,
        sort_order: filters.sortBy,
        limit_count: filters.limit,
        offset_count: filters.offset,
        query_text: filters.q,
    });
}
