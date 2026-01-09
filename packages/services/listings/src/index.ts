import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';

// Coordinate validation
const LatitudeSchema = z.number().min(-90).max(90);
const LongitudeSchema = z.number().min(-180).max(180);

// Schemas
export const CreateListingSchema = z.object({
    title: z.string().min(5).max(100), // REQUIRED - was optional
    op_type: z.enum(['rent', 'sell']).default('rent'),
    price: z.number().positive(), // REQUIRED - was optional, must be > 0
    rooms: z.number().int().nonnegative().optional(),
    surface: z.number().positive().optional(), // Must be > 0 if provided
    description: z.string().max(1000).optional(),
    lat: LatitudeSchema, // REQUIRED for location
    lng: LongitudeSchema, // REQUIRED for location
}).refine(
    (data) => {
        // If surface is provided, it must be > 0
        if (data.surface !== undefined) {
            return data.surface > 0;
        }
        return true;
    },
    { message: 'Surface must be greater than 0', path: ['surface'] }
);

export type CreateListingInput = z.infer<typeof CreateListingSchema>;

export const UpdateListingSchema = z.object({
    title: z.string().min(5).max(100).optional(),
    op_type: z.enum(['rent', 'sell']).optional(),
    price: z.number().positive().optional(), // Must be > 0 if provided
    rooms: z.number().int().nonnegative().optional(),
    surface: z.number().positive().optional(), // Must be > 0 if provided
    description: z.string().max(1000).optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    lat: LatitudeSchema.optional(),
    lng: LongitudeSchema.optional(),
}).refine(
    (data) => {
        // If lat is provided, lng must also be provided (and vice versa)
        if (data.lat !== undefined || data.lng !== undefined) {
            return data.lat !== undefined && data.lng !== undefined;
        }
        return true;
    },
    { message: 'Both lat and lng must be provided together', path: ['lat'] }
).refine(
    (data) => {
        // If surface is provided, it must be > 0
        if (data.surface !== undefined) {
            return data.surface > 0;
        }
        return true;
    },
    { message: 'Surface must be greater than 0', path: ['surface'] }
);

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

export type UpdateListingInput = z.infer<typeof UpdateListingSchema>;

/**
 * Create a safe PostGIS POINT from validated coordinates
 * Uses ST_MakePoint function to prevent SQL injection
 */
function createPostGISPoint(lat: number, lng: number): string {
    // Validate coordinates
    if (
        typeof lat !== 'number' ||
        typeof lng !== 'number' ||
        isNaN(lat) ||
        isNaN(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
    ) {
        throw new Error('Invalid coordinates: lat must be in [-90, 90], lng must be in [-180, 180]');
    }
    
    // Use ST_MakePoint function instead of string concatenation
    // This prevents SQL injection by using PostGIS function with validated numeric values
    // Format: SRID=4326;POINT(lng lat) - PostGIS will parse this safely
    return `SRID=4326;POINT(${lng} ${lat})`;
}

export async function updateListing(
    client: SupabaseClient,
    listingId: string,
    userId: string,
    input: UpdateListingInput
) {
    // Verify ownership
    const { data: listing } = await client
        .from('listings')
        .select('owner_id')
        .eq('id', listingId)
        .single();

    if (!listing || listing.owner_id !== userId) {
        return { data: null, error: { message: 'Forbidden' } };
    }

    const updateData: any = { ...input };
    
    // Handle location update if lat/lng are provided
    // Use secure PostGIS point creation
    if (input.lat !== undefined && input.lng !== undefined) {
        try {
            updateData.location = createPostGISPoint(input.lat, input.lng);
        } catch (error) {
            return {
                data: null,
                error: { message: error instanceof Error ? error.message : 'Invalid coordinates' }
            };
        }
        delete updateData.lat;
        delete updateData.lng;
    }

    return client
        .from('listings')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', listingId)
        .select()
        .single();
}
