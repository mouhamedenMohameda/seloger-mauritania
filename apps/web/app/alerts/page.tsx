'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAlerts, useDeleteAlert, useUpdateAlert, type SearchAlert } from '@/lib/hooks/use-alerts';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/lib/toast';

export default function AlertsPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const toast = useToast();
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [activeOnly, setActiveOnly] = useState(true);

    const { data, isLoading, error } = useAlerts(activeOnly);
    const deleteAlert = useDeleteAlert();
    const updateAlert = useUpdateAlert();

    const alerts = data?.data || [];

    useEffect(() => {
        const checkAuth = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login?redirect=/alerts');
            }
        };

        checkAuth();
    }, [router]);

    const handleToggleActive = async (alert: SearchAlert) => {
        try {
            await updateAlert.mutateAsync({
                id: alert.id,
                data: { active: !alert.active },
            });
            toast.success(alert.active ? t('alertDeactivated') || 'Alerte désactivée' : t('alertActivated') || 'Alerte activée');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t('error') || 'Erreur');
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;

        try {
            await deleteAlert.mutateAsync(deleteConfirm);
            toast.success(t('alertDeleted') || 'Alerte supprimée');
            setDeleteConfirm(null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t('error') || 'Erreur');
        }
    };

    const formatAlertCriteria = (alert: SearchAlert) => {
        const criteria: string[] = [];

        if (alert.min_price || alert.max_price) {
            const priceRange = [
                alert.min_price ? `${alert.min_price.toLocaleString()} MRU` : '',
                alert.max_price ? `${alert.max_price.toLocaleString()} MRU` : '',
            ].filter(Boolean).join(' - ');
            criteria.push(`${t('price')}: ${priceRange}`);
        }

        if (alert.min_rooms || alert.max_rooms) {
            const roomsRange = [
                alert.min_rooms ? String(alert.min_rooms) : '',
                alert.max_rooms ? String(alert.max_rooms) : '',
            ].filter(Boolean).join(' - ');
            criteria.push(`${t('rooms')}: ${roomsRange}`);
        }

        if (alert.min_surface || alert.max_surface) {
            const surfaceRange = [
                alert.min_surface ? `${alert.min_surface} m²` : '',
                alert.max_surface ? `${alert.max_surface} m²` : '',
            ].filter(Boolean).join(' - ');
            criteria.push(`${t('surface')}: ${surfaceRange}`);
        }

        if (alert.op_type) {
            criteria.push(alert.op_type === 'rent' ? t('forRent') : t('forSale'));
        }

        if (alert.neighborhood) {
            criteria.push(`${t('neighborhood')}: ${alert.neighborhood}`);
        } else if (alert.center_lat && alert.center_lng) {
            criteria.push(`${t('radius')}: ${alert.radius_km} km`);
        }

        return criteria.length > 0 ? criteria.join(' • ') : t('allListings') || 'Toutes les annonces';
    };

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
            <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{t('myAlerts') || 'Mes Alertes'}</h1>
                        <p className="mt-2 text-gray-500">{t('alertsDescription')}</p>
                    </div>
                    <Link
                        href="/alerts/new"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-semibold"
                    >
                        {t('createAlert') || 'Créer une alerte'}
                    </Link>
                </div>

                {/* Filter Tabs */}
                <div className="mb-6 flex gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                    <button
                        onClick={() => setActiveOnly(true)}
                        className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-md transition-all duration-200 ${activeOnly
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                    >
                        {t('active') || 'Actives'} ({alerts.filter(a => a.active).length})
                    </button>
                    <button
                        onClick={() => setActiveOnly(false)}
                        className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-md transition-all duration-200 ${!activeOnly
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                    >
                        {t('all') || 'Toutes'} ({alerts.length})
                    </button>
                </div>

                {alerts.length === 0 ? (
                    <EmptyState
                        title={t('noAlerts') || 'Aucune alerte'}
                        message={t('noAlertsMessage') || 'Créez une alerte pour être notifié des nouvelles annonces correspondant à vos critères'}
                        action={
                            <Link
                                href="/alerts/new"
                                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-semibold"
                            >
                                {t('createAlert') || 'Créer une alerte'}
                            </Link>
                        }
                    />
                ) : (
                    <div className="space-y-4">
                        {alerts.map((alert) => (
                            <div
                                key={alert.id}
                                className={`bg-white rounded-xl shadow-sm border-2 p-6 transition-all duration-200 hover:shadow-md ${alert.active ? 'border-indigo-200 bg-gradient-to-br from-white to-indigo-50/30' : 'border-gray-200 opacity-75'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-3">
                                            <h3 className="text-lg font-bold text-gray-900 truncate">{alert.name}</h3>
                                            <span className={`px-2.5 py-1 text-xs font-bold rounded-md shadow-sm flex-shrink-0 ${alert.active
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-gray-400 text-white'
                                                }`}>
                                                {alert.active ? t('active') || 'Active' : t('inactive') || 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="mb-4">
                                            <p className="text-sm text-gray-700 font-medium leading-relaxed">{formatAlertCriteria(alert)}</p>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            {alert.email_notifications && (
                                                <span className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-md">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                    </svg>
                                                    {t('emailNotifications') || 'Email'}
                                                </span>
                                            )}
                                            {alert.last_notified_at && (
                                                <span className="text-gray-500">
                                                    {t('lastNotified') || 'Dernière notification'}: {new Date(alert.last_notified_at).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => handleToggleActive(alert)}
                                            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm ${alert.active
                                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                }`}
                                        >
                                            {alert.active ? t('deactivate') || 'Désactiver' : t('activate') || 'Activer'}
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(alert.id)}
                                            className="px-4 py-2 text-sm font-semibold text-red-700 bg-white border-2 border-red-300 rounded-lg hover:bg-red-50 transition-all duration-200 shadow-sm"
                                        >
                                            {t('delete')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Delete Confirmation Dialog */}
                <ConfirmDialog
                    isOpen={!!deleteConfirm}
                    onClose={() => setDeleteConfirm(null)}
                    onConfirm={handleDelete}
                    title={t('confirmDeleteAlert') || 'Confirmer la suppression'}
                    message={t('confirmDeleteAlertMessage') || 'Êtes-vous sûr de vouloir supprimer cette alerte ?'}
                    confirmText={t('delete') || 'Supprimer'}
                    cancelText={t('cancel') || 'Annuler'}
                    confirmVariant="danger"
                />
            </div>
        </div>
    );
}

