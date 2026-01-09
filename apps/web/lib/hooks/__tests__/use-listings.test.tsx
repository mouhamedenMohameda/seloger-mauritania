import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMyListings, useListing } from '../use-listings';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Setup QueryClient for testing
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient} > {children} </QueryClientProvider>
    );
};

describe('Listing Hooks', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    it('useMyListings should fetch user listings', async () => {
        const mockData = { data: [{ id: '1', title: 'Test' }], pagination: { limit: 20, offset: 0, count: 1 } };
        (global.fetch as vi.Mock).mockResolvedValue({
            ok: true,
            json: async () => mockData,
        });

        const { result } = renderHook(() => useMyListings(0, 20), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.data[0].title).toBe('Test');
        expect(global.fetch).toHaveBeenCalledWith('/api/listings?limit=20&offset=0', expect.any(Object));
    });

    it('useListing should fetch single listing', async () => {
        const mockData = { id: '123', title: 'Single' };
        (global.fetch as vi.Mock).mockResolvedValue({
            ok: true,
            json: async () => mockData,
        });

        const { result } = renderHook(() => useListing('123'), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data.title).toBe('Single');
        expect(global.fetch).toHaveBeenCalledWith('/api/listings/123');
    });

    it('useListing should handle 404', async () => {
        (global.fetch as vi.Mock).mockResolvedValue({
            ok: false,
            status: 404,
        });

        const { result } = renderHook(() => useListing('999'), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });
});
