'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LoadingState from '@/components/ui/LoadingState';
import { useToast } from '@/lib/toast';
import { useUpdateListing } from '@/lib/hooks/use-listings';
import { getPhotoUrl } from '@/lib/photo-utils';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
    ssr: false,
    loading: () => (
        <div className="h-80 w-full rounded-lg bg-gray-100 animate-pulse" />
    )
});

export default function EditListingPage() {
    const router = useRouter();
    const params = useParams();
    const listingId = params.id as string;
    const { t } = useLanguage();
    const toast = useToast();
    const updateListing = useUpdateListing();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [photos, setPhotos] = useState<File[]>([]);
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
    const [existingPhotos, setExistingPhotos] = useState<Array<{ id: string; url: string }>>([]);
    const [deletePhotoConfirm, setDeletePhotoConfirm] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        title: '',
        price: '',
        rooms: '',
        surface: '',
        op_type: 'rent' as 'rent' | 'sell',
        description: '',
        lat: 18.0735,
        lng: -15.9582,
    });

    useEffect(() => {
        const fetchListing = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login?redirect=/listings/' + listingId + '/edit');
                return;
            }

            try {
                // Fetch listing
                const res = await fetch(`/api/listings/${listingId}`);
                if (!res.ok) {
                    throw new Error(t('error'));
                }
                const listing = await res.json();

                // Verify ownership
                if (listing.owner_id !== user.id) {
                    router.push('/my-listings');
                    return;
                }

                // Extract lat/lng from location if available
                let lat = 18.0735;
                let lng = -15.9582;
                if (listing.location) {
                    // Location is a PostGIS geography point, extract coordinates
                    const match = listing.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
                    if (match) {
                        lng = parseFloat(match[1]);
                        lat = parseFloat(match[2]);
                    }
                }

                setFormData({
                    title: listing.title || '',
                    price: listing.price?.toString() || '',
                    rooms: listing.rooms?.toString() || '',
                    surface: listing.surface?.toString() || '',
                    op_type: listing.op_type || 'rent',
                    description: listing.description || '',
                    lat,
                    lng,
                });

                // Fetch existing photos
                const { data: photosData } = await supabase
                    .from('listing_photos')
                    .select('*')
                    .eq('listing_id', listingId)
                    .order('rank', { ascending: true });

                if (photosData) {
                    const photoUrls = photosData.map(photo => {
                        if (!photo.storage_path) return null;
                        const url = getPhotoUrl(supabase, photo.storage_path);
                        return { id: photo.id, url };
                    }).filter(Boolean) as Array<{ id: string; url: string }>;
                    setExistingPhotos(photoUrls);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : t('error'));
            } finally {
                setLoading(false);
            }
        };

        if (listingId) {
            fetchListing();
        }
    }, [listingId, router]);

    useEffect(() => {
        return () => {
            photoPreviews.forEach(url => URL.revokeObjectURL(url));
        };
    }, [photoPreviews]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        setError(null);
    };

    const handleLocationChange = (lat: number, lng: number) => {
        setFormData(prev => ({ ...prev, lat, lng }));
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const newPhotos = [...photos, ...files].slice(0, 10);
        setPhotos(newPhotos);
        const newPreviews = newPhotos.map(file => URL.createObjectURL(file));
        setPhotoPreviews(newPreviews);
    };

    const removePhoto = (index: number) => {
        const newPhotos = photos.filter((_, i) => i !== index);
        const newPreviews = photoPreviews.filter((_, i) => i !== index);
        setPhotos(newPhotos);
        setPhotoPreviews(newPreviews);
    };

    const handleRemovePhotoClick = (photoId: string) => {
        setDeletePhotoConfirm(photoId);
    };

    const removeExistingPhoto = async (photoId: string) => {
        if (!photoId) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('listing_photos')
                .delete()
                .eq('id', photoId);

            if (error) throw error;
            setExistingPhotos(existingPhotos.filter(p => p.id !== photoId));
            toast.success(t('photoRemoved') || 'Photo supprimée avec succès');
            setDeletePhotoConfirm(null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t('error') || 'Erreur');
        }
    };

    const uploadPhotos = async (listingId: string) => {
        if (photos.length === 0) return;

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const uploadPromises = photos.map(async (file, index) => {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${listingId}/${crypto.randomUUID()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('listings')
                .upload(fileName, file, { cacheControl: '3600', upsert: false });

            if (uploadError) throw uploadError;

            const commitRes = await fetch(`/api/listings/${listingId}/photos/commit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ storagePath: fileName }),
            });

            if (!commitRes.ok) throw new Error('Failed to commit photo');
        });

        await Promise.all(uploadPromises);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            await updateListing.mutateAsync({
                id: listingId,
                data: {
                    title: formData.title,
                    price: formData.price ? Number(formData.price) : undefined,
                    rooms: formData.rooms ? Number(formData.rooms) : undefined,
                    surface: formData.surface ? Number(formData.surface) : undefined,
                    op_type: formData.op_type,
                    description: formData.description,
                    lat: formData.lat,
                    lng: formData.lng,
                },
            });

            toast.success(t('listingUpdated') || 'Annonce mise à jour avec succès');

            // Upload new photos if any
            if (photos.length > 0) {
                try {
                    await uploadPhotos(listingId);
                    toast.success(t('photosUploaded') || 'Photos téléchargées avec succès');
                } catch (photoError) {
                    toast.warning(t('photosUploadFailed') || 'Les photos n\'ont pas pu être téléchargées');
                }
            }

            router.push(`/listings/${listingId}`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('updateFailed') || 'Échec de la mise à jour';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <LoadingState fullScreen message={t('loadingListing') || 'Chargement...'} />;
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                <div className="mb-10">
                    <h1 className="text-2xl font-bold text-gray-900">{t('editListingTitle')}</h1>
                    <p className="mt-1 text-sm text-gray-500">{t('updateListingDetails')}</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1.5">
                                {t('title')} <span className="text-red-500">{t('required')}</span>
                            </label>
                            <input
                                id="title"
                                name="title"
                                type="text"
                                required
                                minLength={5}
                                value={formData.title}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 bg-white"
                                placeholder={t('titlePlaceholder')}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    {t('price')} <span className="text-red-500">{t('required')}</span>
                                </label>
                                <input
                                    id="price"
                                    name="price"
                                    type="number"
                                    required
                                    min="0"
                                    value={formData.price}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 bg-white"
                                />
                            </div>
                            <div>
                                <label htmlFor="op_type" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    {t('type')} <span className="text-red-500">{t('required')}</span>
                                </label>
                                <select
                                    id="op_type"
                                    name="op_type"
                                    value={formData.op_type}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 bg-white"
                                >
                                    <option value="rent">{t('forRent')}</option>
                                    <option value="sell">{t('forSale')}</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="rooms" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    {t('rooms')}
                                </label>
                                <input
                                    id="rooms"
                                    name="rooms"
                                    type="number"
                                    min="0"
                                    value={formData.rooms}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 bg-white"
                                />
                            </div>
                            <div>
                                <label htmlFor="surface" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    {t('surface')}
                                </label>
                                <input
                                    id="surface"
                                    name="surface"
                                    type="number"
                                    min="0"
                                    value={formData.surface}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 bg-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
                                {t('description')}
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                rows={6}
                                value={formData.description}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 bg-white resize-none"
                                placeholder={t('descriptionPlaceholder')}
                            />
                        </div>

                        {/* Existing Photos */}
                        {existingPhotos.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    {t('currentPhotos')}
                                </label>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                    {existingPhotos.map((photo) => (
                                        <div key={photo.id} className="relative aspect-video rounded-md overflow-hidden group">
                                            <img src={photo.url} alt="Listing photo" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => handleRemovePhotoClick(photo.id)}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                aria-label="Remove photo"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Photo Upload */}
                        <div>
                            <label htmlFor="photos" className="block text-sm font-medium text-gray-700 mb-1.5">
                                {t('addMorePhotos')}
                            </label>
                            <div
                                className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6 hover:border-gray-400 transition-colors cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="space-y-1 text-center">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <div className="flex text-sm text-gray-600">
                                        <p className="relative cursor-pointer rounded-md bg-white font-medium text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:text-indigo-500">
                                            {t('uploadFile')}
                                        </p>
                                        <p className="pl-1">{t('orDragDrop')}</p>
                                    </div>
                                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                                </div>
                                <input
                                    id="photos"
                                    name="photos"
                                    type="file"
                                    className="sr-only"
                                    onChange={handlePhotoChange}
                                    multiple
                                    accept="image/*"
                                    ref={fileInputRef}
                                />
                            </div>
                            {photoPreviews.length > 0 && (
                                <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                    {photoPreviews.map((preview, index) => (
                                        <div key={index} className="relative aspect-video rounded-md overflow-hidden group">
                                            <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => removePhoto(index)}
                                                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                aria-label="Remove photo"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            {t('location')} <span className="text-red-500">{t('required')}</span>
                        </label>
                        <LocationPicker
                            initialLat={formData.lat}
                            initialLng={formData.lng}
                            onLocationChange={handleLocationChange}
                        />
                    </div>

                    <div className="md:col-span-2 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 active:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {saving ? t('saving') : t('saveChanges')}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Delete Photo Confirmation Dialog */}
            <ConfirmDialog
                isOpen={!!deletePhotoConfirm}
                onClose={() => setDeletePhotoConfirm(null)}
                onConfirm={() => deletePhotoConfirm && removeExistingPhoto(deletePhotoConfirm)}
                title={t('confirmRemovePhoto') || 'Confirmer la suppression'}
                message={t('confirmRemovePhotoMessage') || 'Êtes-vous sûr de vouloir supprimer cette photo ? Cette action est irréversible.'}
                confirmText={t('delete') || 'Supprimer'}
                cancelText={t('cancel') || 'Annuler'}
                confirmVariant="danger"
            />
        </div>
    );
}

