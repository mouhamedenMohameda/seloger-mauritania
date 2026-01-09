'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { validateFiles, retryWithBackoff } from '@/lib/file-validation';
import { useToast } from '@/lib/toast';
import { useCreateListing } from '@/lib/hooks/use-listings';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
    ssr: false,
    loading: () => (
        <div className="h-80 w-full rounded-lg bg-gray-100 animate-pulse" />
    )
});

export default function PostListingPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const toast = useToast();
    const createListing = useCreateListing();
    const [error, setError] = useState<string | null>(null);
    const [photos, setPhotos] = useState<File[]>([]);
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
    const [uploadProgress, setUploadProgress] = useState<{ [key: number]: number }>({});
    const [uploadingPhotos, setUploadingPhotos] = useState(false);
    const loading = createListing.isPending || uploadingPhotos;
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
        const checkAuth = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login?redirect=/post');
            }
        };
        checkAuth();
    }, [router]);

    // Cleanup preview URLs
    useEffect(() => {
        return () => {
            photoPreviews.forEach(url => URL.revokeObjectURL(url));
        };
    }, [photoPreviews]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError(null);
    };

    const handleLocationChange = (lat: number, lng: number) => {
        setFormData(prev => ({ ...prev, lat, lng }));
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Validate files before adding
        const validation = validateFiles(files);
        
        if (!validation.valid) {
            setError(validation.error || 'Erreur de validation des fichiers');
            e.target.value = ''; // Reset input
            return;
        }

        // Check total count
        const totalPhotos = photos.length + files.length;
        if (totalPhotos > 10) {
            setError('Maximum 10 photos autorisées');
            e.target.value = '';
            return;
        }

        const newPhotos = [...photos, ...files];
        setPhotos(newPhotos);

        // Create previews
        const newPreviews = newPhotos.map(file => URL.createObjectURL(file));
        setPhotoPreviews(newPreviews);
        setError(null); // Clear any previous errors
    };

    const removePhoto = (index: number) => {
        const newPhotos = photos.filter((_, i) => i !== index);
        const newPreviews = photoPreviews.filter((_, i) => i !== index);
        setPhotos(newPhotos);
        setPhotoPreviews(newPreviews);
    };

    const uploadPhotos = async (listingId: string) => {
        if (photos.length === 0) return;

        setUploadingPhotos(true);
        setUploadProgress({});

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        const uploadPromises = photos.map(async (file, index) => {
            // Update progress for this file
            setUploadProgress(prev => ({ ...prev, [index]: 0 }));

            try {
                // Generate unique filename
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${index}.${fileExt}`;
                const filePath = `${user.id}/${listingId}/${fileName}`;

                // Upload with retry logic
                const uploadData = await retryWithBackoff(async () => {
                    setUploadProgress(prev => ({ ...prev, [index]: 50 }));
                    
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('listings')
                        .upload(filePath, file, {
                            contentType: file.type,
                            upsert: false
                        });

                    if (uploadError) {
                        throw new Error(`Upload failed: ${uploadError.message}`);
                    }

                    if (!uploadData?.path) {
                        throw new Error('Upload succeeded but no path returned');
                    }

                    return uploadData;
                }, 3, 1000); // 3 retries, 1s initial delay

                setUploadProgress(prev => ({ ...prev, [index]: 75 }));

                // Commit photo to database with retry
                await retryWithBackoff(async () => {
                    const commitRes = await fetch(`/api/listings/${listingId}/photos/commit`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ storagePath: uploadData.path }),
                    });

                    if (!commitRes.ok) {
                        const errorData = await commitRes.json().catch(() => ({}));
                        throw new Error(`Failed to commit photo: ${errorData.error || commitRes.statusText}`);
                    }

                    return commitRes;
                }, 3, 1000);

                setUploadProgress(prev => ({ ...prev, [index]: 100 }));
                return { success: true, index, path: uploadData.path };
            } catch (err) {
                console.error(`Error uploading photo ${index + 1}:`, err);
                setUploadProgress(prev => ({ ...prev, [index]: -1 })); // -1 indicates error
                throw err;
            }
        });

        try {
            await Promise.all(uploadPromises);
            setUploadProgress({});
        } finally {
            setUploadingPhotos(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const listing = await createListing.mutateAsync({
                title: formData.title,
                price: Number(formData.price),
                rooms: formData.rooms ? Number(formData.rooms) : undefined,
                surface: formData.surface ? Number(formData.surface) : undefined,
                op_type: formData.op_type,
                description: formData.description,
                lat: formData.lat,
                lng: formData.lng,
            });

            toast.success(t('listingCreated') || 'Annonce créée avec succès');

            // Upload photos if any
            if (photos.length > 0 && listing.id) {
                try {
                    await uploadPhotos(listing.id);
                    toast.success(t('photosUploaded') || 'Photos téléchargées avec succès');
                } catch (photoError) {
                    toast.warning(t('photosUploadFailed') || 'L\'annonce a été créée mais les photos n\'ont pas pu être téléchargées');
                }
            }

            router.push(`/listings/${listing.id}`);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('createFailed') || 'Échec de la création';
            setError(errorMessage);
            toast.error(errorMessage);
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                <div className="mb-10">
                    <h1 className="text-2xl font-bold text-gray-900">{t('postListing')}</h1>
                    <p className="mt-1 text-sm text-gray-500">{t('fillDetails')}</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column - Form Fields */}
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
                                placeholder={t('titlePlaceholder')}
                            />
                            {formData.title && formData.title.length < 5 && (
                                <p className="mt-1 text-xs text-red-600">
                                    {t('titleMinLength')} ({formData.title.length}/5)
                                </p>
                            )}
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
                                    placeholder="0"
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
                                    placeholder="3"
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
                                    placeholder="120"
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white resize-none"
                                placeholder={t('descriptionPlaceholder')}
                            />
                        </div>

                        {/* Photo Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                {t('photos')} ({t('maxPhotos')})
                            </label>
                            <div className="space-y-3">
                                <div className="flex items-center justify-center w-full">
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <svg className="w-8 h-8 mb-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                            <p className="mb-2 text-sm text-gray-500">
                                                <span className="font-semibold">{t('uploadFile')}</span> {t('orDragDrop')}
                                            </p>
                                            <p className="text-xs text-gray-500">PNG, JPG, GIF</p>
                                        </div>
                                        <input
                                            type="file"
                                            className="hidden"
                                            multiple
                                            accept="image/*"
                                            onChange={handlePhotoChange}
                                        />
                                    </label>
                                </div>

                                {/* Photo Previews */}
                                {photoPreviews.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {photoPreviews.map((preview, index) => {
                                            const progress = uploadProgress[index];
                                            const hasError = progress === -1;
                                            const isUploading = uploadingPhotos && progress !== undefined && progress !== 100 && !hasError;
                                            
                                            return (
                                                <div key={index} className="relative group">
                                                    <img
                                                        src={preview}
                                                        alt={`Preview ${index + 1}`}
                                                        className={`w-full h-24 object-cover rounded-lg border ${
                                                            hasError ? 'border-red-500' : 'border-gray-200'
                                                        }`}
                                                    />
                                                    {/* Upload Progress Overlay */}
                                                    {isUploading && (
                                                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                                                            <div className="text-white text-xs font-medium">
                                                                {progress}%
                                                            </div>
                                                        </div>
                                                    )}
                                                    {/* Error Indicator */}
                                                    {hasError && (
                                                        <div className="absolute inset-0 bg-red-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                                                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                    {/* Success Indicator */}
                                                    {uploadingPhotos && progress === 100 && (
                                                        <div className="absolute inset-0 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                                                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => removePhoto(index)}
                                                        disabled={isUploading}
                                                        className="absolute top-1 end-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 disabled:cursor-not-allowed"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {/* Upload Status Message */}
                                {uploadingPhotos && (
                                    <div className="mt-2 text-sm text-gray-600">
                                        {t('uploadingPhotos')}...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Map */}
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

                    {/* Submit Button - Full Width */}
                    <div className="md:col-span-2 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 active:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? t('publishing') : t('publish')}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
