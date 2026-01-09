/**
 * React Query hooks for favorites
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Favorite {
    id: string;
    user_id: string;
    listing_id: string;
    created_at: string;
    listings: any; // Full listing data
}

export interface PaginatedFavoritesResponse {
    data: Favorite[];
    pagination: {
        limit: number;
        offset: number;
        count: number;
        total: number;
    };
}

/**
 * Hook to fetch user's favorites with pagination
 */
export function useFavorites(page: number = 0, limit: number = 20) {
    const offset = page * limit;

    return useQuery<PaginatedFavoritesResponse>({
        queryKey: ['favorites', page, limit],
        queryFn: async () => {
            const res = await fetch(`/api/favorites?limit=${limit}&offset=${offset}`, {
                credentials: 'include',
            });

            if (!res.ok) {
                throw new Error('Failed to fetch favorites');
            }

            return res.json();
        },
        staleTime: 30 * 1000, // 30 seconds
    });
}

/**
 * Hook to check if a listing is favorited
 */
export function useIsFavorited(listingId: string | null) {
    return useQuery<{ favorited: boolean }>({
        queryKey: ['favorites', 'check', listingId],
        queryFn: async () => {
            if (!listingId) return { favorited: false };

            const res = await fetch(`/api/favorites/${listingId}`, {
                credentials: 'include',
            });

            if (!res.ok) {
                return { favorited: false };
            }

            return res.json();
        },
        enabled: !!listingId,
        staleTime: 10 * 1000, // 10 seconds
    });
}

/**
 * Hook to toggle favorite (add/remove)
 */
export function useToggleFavorite() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ listingId, favorited }: { listingId: string; favorited: boolean }) => {
            if (favorited) {
                // Remove favorite
                const res = await fetch(`/api/favorites?listingId=${listingId}`, {
                    method: 'DELETE',
                    credentials: 'include',
                });

                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(error.error || 'Failed to remove favorite');
                }

                return { favorited: false };
            } else {
                // Add favorite
                const res = await fetch('/api/favorites', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ listingId }),
                });

                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(error.error || 'Failed to add favorite');
                }

                return { favorited: true };
            }
        },
        onSuccess: (data, variables) => {
            // Invalidate favorites list
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
            // Update the check query
            queryClient.setQueryData(['favorites', 'check', variables.listingId], data);
        },
    });
}

