'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { 
    ssr: false,
    loading: () => (
        <div className="h-80 w-full rounded-lg bg-gray-100 animate-pulse" />
    )
});

export default function PostListingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [photos, setPhotos] = useState<File[]>([]);
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
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

        const newPhotos = [...photos, ...files].slice(0, 10); // Max 10 photos
        setPhotos(newPhotos);

        // Create previews
        const newPreviews = newPhotos.map(file => URL.createObjectURL(file));
        setPhotoPreviews(newPreviews);
    };

    const removePhoto = (index: number) => {
        const newPhotos = photos.filter((_, i) => i !== index);
        const newPreviews = photoPreviews.filter((_, i) => i !== index);
        setPhotos(newPhotos);
        setPhotoPreviews(newPreviews);
    };

    const uploadPhotos = async (listingId: string) => {
        if (photos.length === 0) return;

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        const uploadPromises = photos.map(async (file, index) => {
            try {
                // Generate unique filename
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${index}.${fileExt}`;
                const filePath = `${user.id}/${listingId}/${fileName}`;

                // Upload directly to Supabase Storage
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

                // Commit photo to database
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

                console.log(`Photo ${index + 1} uploaded successfully:`, uploadData.path);
                return { success: true, index, path: uploadData.path };
            } catch (err) {
                console.error(`Error uploading photo ${index + 1}:`, err);
                throw err; // Re-throw to be caught by Promise.all
            }
        });

        await Promise.all(uploadPromises);
        console.log('All photos uploaded successfully');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/listings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title,
                    price: Number(formData.price),
                    rooms: formData.rooms ? Number(formData.rooms) : undefined,
                    surface: formData.surface ? Number(formData.surface) : undefined,
                    op_type: formData.op_type,
                    description: formData.description,
                    lat: formData.lat,
                    lng: formData.lng
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                
                // Handle Zod validation errors
                if (errorData.error?.issues) {
                    const zodErrors = errorData.error.issues;
                    const fieldErrors = zodErrors.map((issue: any) => {
                        const field = issue.path?.[0] || 'field';
                        return `${field.charAt(0).toUpperCase() + field.slice(1)}: ${issue.message}`;
                    });
                    throw new Error(fieldErrors.join('. '));
                }
                
                throw new Error(errorData.error?.message || errorData.error || 'Failed to create listing');
            }

            const listing = await res.json();
            
            // Upload photos if any
            if (photos.length > 0 && listing.id) {
                try {
                    console.log('Starting photo upload for listing:', listing.id);
                    await uploadPhotos(listing.id);
                    console.log('Photos uploaded successfully');
                } catch (photoError) {
                    console.error('Error uploading photos:', photoError);
                    setError(`Listing created but photos failed to upload: ${photoError instanceof Error ? photoError.message : 'Unknown error'}`);
                    // Still redirect, but show error
                    setTimeout(() => {
                        router.push(`/listings/${listing.id}`);
                    }, 2000);
                    return;
                }
            }
            
            router.push(`/listings/${listing.id}`);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                <div className="mb-10">
                    <h1 className="text-2xl font-bold text-gray-900">Post a Listing</h1>
                    <p className="mt-1 text-sm text-gray-500">Fill in the details below to create your listing</p>
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
                                Title <span className="text-red-500">*</span>
                                <span className="text-xs text-gray-500 font-normal ml-1">(at least 5 characters)</span>
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
                                placeholder="e.g. Spacious Luxury Apartment in Tevragh Zeina"
                            />
                            {formData.title && formData.title.length < 5 && (
                                <p className="mt-1 text-xs text-red-600">
                                    Title must be at least 5 characters ({formData.title.length}/5)
                                </p>
                            )}
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
                                    placeholder="0"
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
                                    placeholder="e.g. 3"
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
                                    placeholder="e.g. 120"
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white resize-none"
                                placeholder="Describe your property in detail..."
                            />
                        </div>

                        {/* Photo Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Photos (Optional)
                            </label>
                            <div className="space-y-3">
                                <div className="flex items-center justify-center w-full">
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <svg className="w-8 h-8 mb-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                            <p className="mb-2 text-sm text-gray-500">
                                                <span className="font-semibold">Click to upload</span> or drag and drop
                                            </p>
                                            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB (max 10 photos)</p>
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
                                        {photoPreviews.map((preview, index) => (
                                            <div key={index} className="relative group">
                                                <img
                                                    src={preview}
                                                    alt={`Preview ${index + 1}`}
                                                    className="w-full h-24 object-cover rounded-lg border border-gray-200"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removePhoto(index)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
                    </div>

                    {/* Right Column - Map */}
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

                    {/* Submit Button - Full Width */}
                    <div className="md:col-span-2 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 active:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? 'Creating...' : 'Post Listing'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
