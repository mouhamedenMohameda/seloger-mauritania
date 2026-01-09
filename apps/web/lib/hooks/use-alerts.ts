/**
 * React Query hooks for search alerts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

export const CreateAlertSchema = z.object({
    name: z.string().min(1).max(100),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    minRooms: z.number().int().nonnegative().optional(),
    maxRooms: z.number().int().nonnegative().optional(),
    minSurface: z.number().positive().optional(),
    maxSurface: z.number().positive().optional(),
    opType: z.enum(['rent', 'sell']).optional(),
    neighborhood: z.string().optional(),
    centerLat: z.number().min(-90).max(90).optional(),
    centerLng: z.number().min(-180).max(180).optional(),
    radiusKm: z.number().positive().max(50).default(5).optional(),
    emailNotifications: z.boolean().default(true).optional(),
    active: z.boolean().default(true).optional(),
});

export type CreateAlertInput = z.infer<typeof CreateAlertSchema>;

export interface SearchAlert {
    id: string;
    user_id: string;
    name: string;
    min_price: number | null;
    max_price: number | null;
    min_rooms: number | null;
    max_rooms: number | null;
    min_surface: number | null;
    max_surface: number | null;
    op_type: 'rent' | 'sell' | null;
    neighborhood: string | null;
    center_lat: number | null;
    center_lng: number | null;
    radius_km: number;
    email_notifications: boolean;
    push_notifications: boolean;
    last_notified_at: string | null;
    active: boolean;
    created_at: string;
    updated_at: string;
}

/**
 * Hook to fetch user's search alerts
 */
export function useAlerts(activeOnly: boolean = false) {
    return useQuery<{ data: SearchAlert[] }>({
        queryKey: ['alerts', activeOnly],
        queryFn: async () => {
            const res = await fetch(`/api/alerts?active=${activeOnly}`, {
                credentials: 'include',
            });

            if (!res.ok) {
                throw new Error('Failed to fetch alerts');
            }

            return res.json();
        },
        staleTime: 30 * 1000, // 30 seconds
    });
}

/**
 * Hook to create a search alert
 */
export function useCreateAlert() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateAlertInput) => {
            const res = await fetch('/api/alerts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to create alert');
            }

            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
        },
    });
}

/**
 * Hook to update a search alert
 */
export function useUpdateAlert() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<CreateAlertInput> }) => {
            const res = await fetch(`/api/alerts/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to update alert');
            }

            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
        },
    });
}

/**
 * Hook to delete a search alert
 */
export function useDeleteAlert() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/alerts/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to delete alert');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
        },
    });
}

