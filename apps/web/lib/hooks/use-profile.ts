import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

type UserRole = 'user' | 'admin' | 'agence';

export interface Profile {
    id: string;
    role: UserRole;
    full_name: string | null;
    phone: string | null;
    created_at: string;
}

export interface User {
    id: string;
    email: string;
}

export interface UserProfile {
    user: User;
    profile: Profile;
}

/**
 * Hook to fetch the current user's profile
 */
export function useProfile() {
    return useQuery({
        queryKey: ['profile'],
        queryFn: async (): Promise<UserProfile | null> => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                return null;
            }

            const res = await fetch('/api/me');
            if (!res.ok) {
                throw new Error('Failed to fetch profile');
            }

            return res.json();
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
    });
}

/**
 * Hook to check if the current user is an admin
 */
export function useIsAdmin() {
    const { data } = useProfile();
    return data?.profile?.role === 'admin';
}
