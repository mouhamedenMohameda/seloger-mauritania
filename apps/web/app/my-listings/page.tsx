'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Listing {
    id: string;
    title: string;
    price: number;
    op_type: 'rent' | 'sell';
    status: 'draft' | 'published' | 'archived';
    rooms: number | null;
    surface: number | null;
    created_at: string;
    updated_at: string;
}

export default function MyListingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [listings, setListings] = useState<Listing[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchListings = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login?redirect=/my-listings');
                return;
            }

            try {
                const { data, error: fetchError } = await supabase
                    .from('listings')
                    .select('*')
                    .eq('owner_id', user.id)
                    .order('created_at', { ascending: false });

                if (fetchError) {
                    throw new Error(fetchError.message);
                }

                setListings(data || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load listings');
            } finally {
                setLoading(false);
            }
        };

        fetchListings();
    }, [router]);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this listing?')) {
            return;
        }

        try {
            const supabase = createClient();
            const { error: deleteError } = await supabase
                .from('listings')
                .delete()
                .eq('id', id);

            if (deleteError) {
                throw new Error(deleteError.message);
            }

            setListings(listings.filter(l => l.id !== id));
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete listing');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Loading your listings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">My Listings</h1>
                        <p className="mt-1 text-sm text-gray-500">Manage your property listings</p>
                    </div>
                    <Link
                        href="/post"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-semibold"
                    >
                        + New Listing
                    </Link>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {listings.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No listings yet</h3>
                        <p className="text-sm text-gray-500 mb-6">Get started by creating your first property listing</p>
                        <Link
                            href="/post"
                            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-semibold"
                        >
                            Create Your First Listing
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {listings.map((listing) => (
                            <div key={listing.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
                                                {listing.title || 'Untitled Listing'}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                                    listing.status === 'published' 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : listing.status === 'draft'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {listing.status}
                                                </span>
                                                <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                                    listing.op_type === 'rent' 
                                                        ? 'bg-indigo-100 text-indigo-800' 
                                                        : 'bg-green-100 text-green-800'
                                                }`}>
                                                    {listing.op_type === 'rent' ? 'For Rent' : 'For Sale'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="text-2xl font-bold text-indigo-600">
                                            {listing.price ? listing.price.toLocaleString() : 'N/A'} MRU
                                            {listing.op_type === 'rent' && <span className="text-sm font-normal text-gray-500 ml-1">/month</span>}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                                            {listing.rooms && (
                                                <span className="flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                                    </svg>
                                                    {listing.rooms} {listing.rooms === 1 ? 'Room' : 'Rooms'}
                                                </span>
                                            )}
                                            {listing.surface && (
                                                <span className="flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                                    </svg>
                                                    {listing.surface} m²
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                                        <Link
                                            href={`/listings/${listing.id}`}
                                            className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-center"
                                        >
                                            View
                                        </Link>
                                        <Link
                                            href={`/listings/${listing.id}/edit`}
                                            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 transition-colors text-center"
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(listing.id)}
                                            className="px-3 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

