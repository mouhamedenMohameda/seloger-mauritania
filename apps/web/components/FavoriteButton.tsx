'use client';

import { useIsFavorited, useToggleFavorite } from '@/lib/hooks/use-favorites';
import { useToast } from '@/lib/toast';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

interface FavoriteButtonProps {
    listingId: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export default function FavoriteButton({ listingId, className = '', size = 'md' }: FavoriteButtonProps) {
    const { t } = useLanguage();
    const toast = useToast();
    const supabase = createClient();
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Check authentication
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setIsAuthenticated(!!user);
        };
        checkAuth();
    }, [supabase]);

    const { data: favoriteData, isLoading } = useIsFavorited(isAuthenticated ? listingId : null);
    const toggleFavorite = useToggleFavorite();

    const favorited = favoriteData?.favorited || false;

    const handleClick = async () => {
        if (!isAuthenticated) {
            toast.warning(t('loginRequired') || 'Vous devez être connecté pour ajouter aux favoris');
            return;
        }

        try {
            await toggleFavorite.mutateAsync({ listingId, favorited });
            if (favorited) {
                toast.success(t('favoriteRemoved') || 'Retiré des favoris');
            } else {
                toast.success(t('favoriteAdded') || 'Ajouté aux favoris');
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t('error') || 'Erreur');
        }
    };

    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-10 h-10',
    };

    if (!isAuthenticated) {
        return null; // Don't show button if not authenticated
    }

    return (
        <button
            onClick={handleClick}
            disabled={isLoading || toggleFavorite.isPending}
            className={`${sizeClasses[size]} flex items-center justify-center rounded-full transition-all ${
                favorited
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
            } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            aria-label={favorited ? t('removeFavorite') || 'Retirer des favoris' : t('addFavorite') || 'Ajouter aux favoris'}
        >
            {isLoading || toggleFavorite.isPending ? (
                <div className="animate-spin rounded-full border-2 border-current border-t-transparent" style={{ width: '60%', height: '60%' }} />
            ) : favorited ? (
                <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
            ) : (
                <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
            )}
        </button>
    );
}

