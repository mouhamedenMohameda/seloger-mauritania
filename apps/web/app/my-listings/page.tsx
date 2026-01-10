'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useMyListings, useDeleteListing, type Listing } from '@/lib/hooks/use-listings';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ListingCard from '@/components/ListingCard';
import { useToast } from '@/lib/toast';

const ITEMS_PER_PAGE = 20;

export default function MyListingsPage() {
    const router = useRouter();
    const { t, lang } = useLanguage();
    const [page, setPage] = useState(0);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
    const toast = useToast();
    
    const { data, isLoading, error: queryError } = useMyListings(page, ITEMS_PER_PAGE);
    const deleteListing = useDeleteListing();

    const listings = data?.data || [];
    const totalItems = data?.pagination.total || 0;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    useEffect(() => {
        const checkAuth = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login?redirect=/my-listings');
            }
        };

        checkAuth();
    }, [router]);

    const handleDeleteClick = (id: string, title: string) => {
        setDeleteConfirm({ id, title });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirm) return;

        try {
            await deleteListing.mutateAsync(deleteConfirm.id);
            toast.success(t('listingDeleted') || 'Annonce supprimée avec succès');
            setDeleteConfirm(null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t('deleteFailed') || 'Échec de la suppression');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 lg:py-12 sm:px-6 lg:px-8">
                <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('myListingsTitle')}</h1>
                        <p className="mt-1 text-sm text-gray-500">{t('manageListings')}</p>
                    </div>
                    <Link
                        href="/post"
                        className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-semibold w-full sm:w-auto"
                    >
                        {t('newListing')}
                    </Link>
                </div>

                {isLoading ? (
                    <LoadingState message={t('loading') || 'Chargement...'} />
                ) : queryError ? (
                    <ErrorState
                        message={queryError.message || t('loadFailed') || 'Échec du chargement'}
                        onRetry={() => window.location.reload()}
                    />
                ) : listings.length === 0 ? (
                    <EmptyState
                        title={t('noListingsYet') || 'Aucune annonce'}
                        message={t('getStarted') || 'Commencez par créer votre première annonce'}
                        action={
                            <Link
                                href="/post"
                                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-semibold"
                            >
                                {t('createFirstListing') || 'Créer une annonce'}
                            </Link>
                        }
                    />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {listings.map((listing) => (
                            <div key={listing.id} className="group relative flex flex-col">
                                <ListingCard
                                    listing={listing}
                                    showFavorite={false}
                                    showStatus={true}
                                    hideActionButton={true}
                                />
                                {/* Action buttons - positioned below card */}
                                <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                    <Link
                                        href={`/listings/${listing.id}`}
                                        className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-center"
                                    >
                                        {t('view')}
                                    </Link>
                                    <Link
                                        href={`/listings/${listing.id}/edit`}
                                        className="flex-1 px-3 py-2 text-sm font-semibold text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 transition-colors text-center"
                                    >
                                        {t('edit')}
                                    </Link>
                                    <button
                                        onClick={() => handleDeleteClick(listing.id, listing.title || t('untitledListing') || 'Annonce')}
                                        className="w-full sm:w-auto px-3 py-2 text-sm font-semibold text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                                    >
                                        {t('delete')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {t('previous') || 'Précédent'}
                        </button>
                        <span className="px-3 sm:px-4 py-2 text-sm text-gray-700 whitespace-nowrap">
                            {t('page') || 'Page'} {page + 1} {t('of') || 'sur'} {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {t('next') || 'Suivant'}
                        </button>
                    </div>
                )}

                {/* Delete Confirmation Dialog */}
                <ConfirmDialog
                    isOpen={!!deleteConfirm}
                    onClose={() => setDeleteConfirm(null)}
                    onConfirm={handleDeleteConfirm}
                    title={t('confirmDelete') || 'Confirmer la suppression'}
                    message={t('confirmDeleteMessage') || `Êtes-vous sûr de vouloir supprimer "${deleteConfirm?.title}" ? Cette action est irréversible.`}
                    confirmText={t('delete') || 'Supprimer'}
                    cancelText={t('cancel') || 'Annuler'}
                    confirmVariant="danger"
                />
            </div>
        </div>
    );
}

