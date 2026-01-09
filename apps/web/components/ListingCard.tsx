'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import FavoriteButton from './FavoriteButton';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';

interface ListingCardProps {
    listing: {
        id: string;
        title: string | null;
        price: number;
        op_type: 'rent' | 'sell';
        status?: 'draft' | 'published' | 'archived';
        rooms: number | null;
        surface: number | null;
        photos_count?: number;
        created_at?: string;
    };
    showFavorite?: boolean;
    showStatus?: boolean;
    className?: string;
}

export default function ListingCard({ listing, showFavorite = true, showStatus = false, className = '' }: ListingCardProps) {
    const { t, lang } = useLanguage();
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        const fetchFirstPhoto = async () => {
            const { data: photos } = await supabase
                .from('listing_photos')
                .select('storage_path')
                .eq('listing_id', listing.id)
                .order('rank', { ascending: true })
                .limit(1)
                .single();

            if (photos?.storage_path) {
                const { data } = supabase.storage.from('listings').getPublicUrl(photos.storage_path);
                setPhotoUrl(data.publicUrl);
            }
        };

        if (listing.id) {
            fetchFirstPhoto();
        }
    }, [listing.id, supabase]);

    return (
        <div className={`group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 ${className}`}>
            {/* Image Section */}
            <Link href={`/listings/${listing.id}`} className="block relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                {photoUrl ? (
                    <Image
                        src={photoUrl}
                        alt={listing.title || t('property') || 'Property'}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}
                
                {/* Overlay badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-md shadow-sm ${
                        listing.op_type === 'rent'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-green-600 text-white'
                    }`}>
                        {listing.op_type === 'rent' ? t('forRent') : t('forSale')}
                    </span>
                    {showStatus && listing.status && (
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-md shadow-sm ${
                            listing.status === 'published'
                                ? 'bg-green-600 text-white'
                                : listing.status === 'draft'
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-gray-600 text-white'
                        }`}>
                            {listing.status === 'published' ? t('published') : listing.status === 'draft' ? t('draft') : t('archived')}
                        </span>
                    )}
                </div>

                {/* Favorite button overlay */}
                {showFavorite && (
                    <div className="absolute top-3 right-3">
                        <FavoriteButton listingId={listing.id} size="md" />
                    </div>
                )}
            </Link>

            {/* Content Section */}
            <div className="p-5">
                {/* Title */}
                <Link href={`/listings/${listing.id}`}>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                        {listing.title || t('untitledListing')}
                    </h3>
                </Link>

                {/* Price */}
                <div className="mb-3">
                    <div className="text-2xl font-black text-indigo-600 flex items-baseline gap-1.5" dir="ltr">
                        <span>{listing.price ? listing.price.toLocaleString() : 'N/A'}</span>
                        <span className="text-base font-bold">MRU</span>
                        {listing.op_type === 'rent' && (
                            <span className="text-sm font-normal text-gray-500">{t('month')}</span>
                        )}
                    </div>
                </div>

                {/* Details */}
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    {listing.rooms && (
                        <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            <span className="font-medium">{listing.rooms}</span>
                            <span className="text-gray-500">{listing.rooms > 1 ? t('rooms') : t('room')}</span>
                        </span>
                    )}
                    {listing.surface && (
                        <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                            <span className="font-medium">{listing.surface}</span>
                            <span className="text-gray-500">m²</span>
                        </span>
                    )}
                </div>

                {/* Action Button */}
                <Link
                    href={`/listings/${listing.id}`}
                    className="block w-full px-4 py-2.5 text-sm font-semibold text-center text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm"
                >
                    {t('view') || 'Voir les détails'}
                </Link>
            </div>
        </div>
    );
}

