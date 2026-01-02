'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

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
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [photos, setPhotos] = useState<File[]>([]);
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
    const [existingPhotos, setExistingPhotos] = useState<Array<{ id: string; url: string }>>([]);
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
                    throw new Error('Failed to fetch listing');
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
                        const { data } = supabase.storage.from('listings').getPublicUrl(photo.storage_path);
                        return { id: photo.id, url: data.publicUrl };
                    }).filter(Boolean) as Array<{ id: string; url: string }>;
                    setExistingPhotos(photoUrls);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load listing');
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

    const removeExistingPhoto = async (photoId: string) => {
        if (!confirm('Are you sure you want to remove this photo?')) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('listing_photos')
                .delete()
                .eq('id', photoId);

            if (error) throw error;
            setExistingPhotos(existingPhotos.filter(p => p.id !== photoId));
        } catch (err) {
            alert('Failed to remove photo');
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
            const res = await fetch(`/api/listings/${listingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    title: formData.title,
                    price: formData.price ? Number(formData.price) : undefined,
                    rooms: formData.rooms ? Number(formData.rooms) : undefined,
                    surface: formData.surface ? Number(formData.surface) : undefined,
                    op_type: formData.op_type,
                    description: formData.description,
                    lat: formData.lat,
                    lng: formData.lng,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error?.message || errorData.error || 'Failed to update listing');
            }

            // Upload new photos if any
            if (photos.length > 0) {
                await uploadPhotos(listingId);
            }

            router.push(`/listings/${listingId}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Loading listing...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                <div className="mb-10">
                    <h1 className="text-2xl font-bold text-gray-900">Edit Listing</h1>
                    <p className="mt-1 text-sm text-gray-500">Update your listing details</p>
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
                                Title <span className="text-red-500">*</span>
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
                                placeholder="e.g. Spacious Luxury Apartment"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Price (MRU) <span className="text-red-500">*</span>
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
                                    Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="op_type"
                                    name="op_type"
                                    value={formData.op_type}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 bg-white"
                                >
                                    <option value="rent">For Rent</option>
                                    <option value="sell">For Sale</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="rooms" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Rooms
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
                                    Surface (m²)
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
                                Description
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                rows={6}
                                value={formData.description}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 bg-white resize-none"
                                placeholder="Describe your property..."
                            />
                        </div>

                        {/* Existing Photos */}
                        {existingPhotos.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Current Photos
                                </label>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                    {existingPhotos.map((photo) => (
                                        <div key={photo.id} className="relative aspect-video rounded-md overflow-hidden group">
                                            <img src={photo.url} alt="Listing photo" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => removeExistingPhoto(photo.id)}
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
                                Add More Photos (Max 10)
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
                                            Upload a file
                                        </p>
                                        <p className="pl-1">or drag and drop</p>
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
                            Location <span className="text-red-500">*</span>
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
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 active:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

