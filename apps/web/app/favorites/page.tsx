'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useFavorites } from '@/lib/hooks/use-favorites';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import ListingCard from '@/components/ListingCard';

const ITEMS_PER_PAGE = 20;

export default function FavoritesPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [page, setPage] = useState(0);
    
    const { data, isLoading, error } = useFavorites(page, ITEMS_PER_PAGE);

    const favorites = data?.data || [];
    const totalItems = data?.pagination.total || 0;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    useEffect(() => {
        const checkAuth = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login?redirect=/favorites');
            }
        };

        checkAuth();
    }, [router]);

    if (isLoading) {
        return <LoadingState fullScreen message={t('loading') || 'Chargement...'} />;
    }

    if (error) {
        return (
            <ErrorState
                message={error.message || t('loadFailed') || 'Échec du chargement'}
                onRetry={() => window.location.reload()}
            />
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">{t('myFavorites') || 'Mes Favoris'}</h1>
                    <p className="mt-1 text-sm text-gray-500">{t('favoritesDescription') || 'Toutes vos annonces favorites'}</p>
                </div>

                {favorites.length === 0 ? (
                    <EmptyState
                        title={t('noFavorites') || 'Aucun favori'}
                        message={t('noFavoritesMessage') || "Vous n'avez pas encore ajouté d'annonces à vos favoris"}
                        action={
                            <Link
                                href="/"
                                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-semibold"
                            >
                                {t('browseListings') || 'Parcourir les annonces'}
                            </Link>
                        }
                    />
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {favorites.map((favorite) => {
                                const listing = favorite.listings;
                                if (!listing) return null;

                                return (
                                    <ListingCard
                                        key={favorite.id}
                                        listing={listing}
                                        showFavorite={true}
                                        showStatus={false}
                                    />
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-8 flex items-center justify-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {t('previous') || 'Précédent'}
                                </button>
                                <span className="px-4 py-2 text-sm text-gray-700">
                                    {t('page') || 'Page'} {page + 1} {t('of') || 'sur'} {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                    disabled={page >= totalPages - 1}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {t('next') || 'Suivant'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

