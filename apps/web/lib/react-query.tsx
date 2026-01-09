'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Stale time: data is considered fresh for 30 seconds
                        staleTime: 30 * 1000,
                        // Cache time: unused data stays in cache for 5 minutes
                        gcTime: 5 * 60 * 1000,
                        // Retry failed requests once
                        retry: 1,
                        // Refetch on window focus (good for real-time feel)
                        refetchOnWindowFocus: false,
                    },
                    mutations: {
                        // Retry mutations once
                        retry: 1,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
    );
}

