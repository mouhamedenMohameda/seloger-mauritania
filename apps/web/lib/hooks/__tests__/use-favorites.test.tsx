import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFavorites, useIsFavorited, useToggleFavorite } from '../use-favorites';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('Favorites Hooks', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    it('useFavorites should fetch favorites', async () => {
        const mockData = { data: [{ id: 'fav-1' }], pagination: { count: 1 } };
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockData,
        });

        const { result } = renderHook(() => useFavorites(0, 20), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.data[0].id).toBe('fav-1');
    });

    it('useToggleFavorite should call correct API', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ favorited: true }),
        });

        const { result } = renderHook(() => useToggleFavorite(), { wrapper: createWrapper() });

        await act(async () => {
            await result.current.mutateAsync({ listingId: 'l-1', favorited: false });
        });

        expect(global.fetch).toHaveBeenCalledWith('/api/favorites', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ listingId: 'l-1' })
        }));
    });
});
