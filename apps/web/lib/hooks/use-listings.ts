/**
 * React Query hooks for listings with pagination
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        limit: number;
        offset: number;
        count: number;
        total?: number | null;
    };
}

export interface Listing {
    id: string;
    title: string;
    price: number;
    op_type: 'rent' | 'sell';
    status: 'draft' | 'published' | 'archived';
    rooms: number | null;
    surface: number | null;
    description: string | null;
    created_at: string;
    updated_at: string;
    owner_id: string;
    // MongoDB fields
    visit_count?: number;
    sold?: boolean;
    professional?: boolean;
    is_real_location?: boolean;
    client_name?: string | null;
    client_phone_number?: string | null;
    category?: string | null;
    sub_category?: string | null;
    region?: string | null;
    lotissement?: string | null;
    lot?: string[] | null;
    index?: string | null;
    ilot_size?: string | null;
    polygone_area?: string | null;
    elevation?: string | null;
    sides_length?: string | null;
    sub_polygon?: any | null;
    sub_polygon_color?: string | null;
    matterport_link?: string | null;
    profiles?: {
        full_name: string | null;
        phone: string | null;
    };
}

export interface SearchMarkersParams {
    bbox: string; // "minLng,minLat,maxLng,maxLat"
    q?: string;
    minPrice?: string | number;
    maxPrice?: string | number;
    minRooms?: string | number;
    maxRooms?: string | number;
    minSurface?: string | number;
    maxSurface?: string | number;
    opType?: 'rent' | 'sell';
    sortBy?: 'price_asc' | 'price_desc' | 'date_desc' | 'date_asc' | 'surface_desc' | 'surface_asc';
    limit?: number;
    offset?: number;
}

/**
 * Hook to fetch user's listings with pagination
 */
export function useMyListings(page: number = 0, limit: number = 20) {
    const offset = page * limit;

    return useQuery<PaginatedResponse<Listing>>({
        queryKey: ['listings', 'my', page, limit],
        queryFn: async () => {
            const res = await fetch(`/api/listings?limit=${limit}&offset=${offset}`, {
                credentials: 'include',
            });

            if (!res.ok) {
                throw new Error('Failed to fetch listings');
            }

            return res.json();
        },
    });
}

/**
 * Hook to search listings markers (for map)
 */
export function useSearchMarkers(params: SearchMarkersParams & { enabled?: boolean }) {
    const queryParams = new URLSearchParams();
    queryParams.set('bbox', params.bbox);
    if (params.q) queryParams.set('q', params.q);
    if (params.minPrice !== undefined) queryParams.set('minPrice', String(params.minPrice));
    if (params.maxPrice !== undefined) queryParams.set('maxPrice', String(params.maxPrice));
    if (params.minRooms !== undefined) queryParams.set('minRooms', String(params.minRooms));
    if (params.maxRooms !== undefined) queryParams.set('maxRooms', String(params.maxRooms));
    if (params.minSurface !== undefined) queryParams.set('minSurface', String(params.minSurface));
    if (params.maxSurface !== undefined) queryParams.set('maxSurface', String(params.maxSurface));
    if (params.opType) queryParams.set('opType', params.opType);
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    queryParams.set('limit', String(params.limit || 50));
    queryParams.set('offset', String(params.offset || 0));

    return useQuery<PaginatedResponse<any>>({
        queryKey: ['listings', 'markers', params.bbox, params.q, params.minPrice, params.maxPrice, params.minRooms, params.maxRooms, params.minSurface, params.maxSurface, params.opType, params.sortBy, params.limit, params.offset],
        queryFn: async () => {
            const res = await fetch(`/api/search/markers?${queryParams.toString()}`);

            if (!res.ok) {
                throw new Error('Failed to fetch markers');
            }

            return res.json();
        },
        enabled: params.enabled !== false && params.bbox !== '0,0,0,0', // Don't fetch if bbox is not set
        staleTime: 10 * 1000, // 10 seconds - markers update frequently
    });
}

/**
 * Hook to get a single listing by ID
 */
export function useListing(id: string | null) {
    return useQuery({
        queryKey: ['listings', id],
        queryFn: async () => {
            if (!id) return null;

            const res = await fetch(`/api/listings/${id}`);

            if (!res.ok) {
                if (res.status === 404) {
                    return null;
                }
                throw new Error('Failed to fetch listing');
            }

            return res.json();
        },
        enabled: !!id,
    });
}

/**
 * Hook to create a new listing
 */
export function useCreateListing() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            title: string;
            price: number;
            lat: number;
            lng: number;
            op_type: 'rent' | 'sell';
            rooms?: number;
            surface?: number;
            description?: string;
        }) => {
            const res = await fetch('/api/listings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Failed to create listing' }));
                
                // Handle validation errors
                if (errorData.errors && Array.isArray(errorData.errors)) {
                    const validationMessages = errorData.errors
                        .map((e: any) => `${e.field}: ${e.message}`)
                        .join(', ');
                    throw new Error(`Validation failed: ${validationMessages}`);
                }
                
                // Return detailed error message if available
                const errorMessage = errorData.details || errorData.error || 'Failed to create listing';
                throw new Error(errorMessage);
            }

            return res.json();
        },
        onSuccess: () => {
            // Invalidate and refetch listings
            queryClient.invalidateQueries({ queryKey: ['listings'] });
        },
    });
}

/**
 * Hook to update a listing
 */
export function useUpdateListing() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Listing> & { lat?: number; lng?: number } }) => {
            const res = await fetch(`/api/listings/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to update listing');
            }

            return res.json();
        },
        onSuccess: (data) => {
            // Invalidate and refetch
            queryClient.invalidateQueries({ queryKey: ['listings'] });
            queryClient.invalidateQueries({ queryKey: ['listings', data.id] });
        },
    });
}

/**
 * Hook to delete a listing
 */
export function useDeleteListing() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/listings/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to delete listing');
            }
        },
        onSuccess: () => {
            // Invalidate and refetch
            queryClient.invalidateQueries({ queryKey: ['listings'] });
        },
    });
}

