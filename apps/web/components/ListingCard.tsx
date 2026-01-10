'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import FavoriteButton from './FavoriteButton';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import { getPhotoUrl } from '@/lib/photo-utils';

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
        // MongoDB fields
        region?: string | null;
        category?: string | null;
        sub_category?: string | null;
        visit_count?: number;
        lotissement?: string | null;
    };
    showFavorite?: boolean;
    showStatus?: boolean;
    hideActionButton?: boolean;
    className?: string;
}

export default function ListingCard({ listing, showFavorite = true, showStatus = false, hideActionButton = false, className = '' }: ListingCardProps) {
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
                .maybeSingle();

            if (photos?.storage_path) {
                // Use utility function that handles both external URLs (S3) and Supabase Storage
                const url = getPhotoUrl(supabase, photos.storage_path);
                setPhotoUrl(url);
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
                        // Unoptimized for external URLs (S3) and Supabase Storage URLs
                        unoptimized={photoUrl.includes('s3.amazonaws.com') || photoUrl.includes('s3.') || photoUrl.includes('supabase.co')}
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
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-md shadow-sm ${listing.op_type === 'rent'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-green-600 text-white'
                        }`}>
                        {listing.op_type === 'rent' ? t('forRent') : t('forSale')}
                    </span>
                    {showStatus && listing.status && (
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-md shadow-sm ${listing.status === 'published'
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
            <div className="p-4 sm:p-5">
                {/* Title */}
                <Link href={`/listings/${listing.id}`}>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                        {listing.title || t('untitledListing')}
                    </h3>
                </Link>

                {/* Price */}
                <div className="mb-3">
                    <div className="text-xl sm:text-2xl font-black text-indigo-600 flex items-baseline gap-1.5 flex-wrap" dir="ltr">
                        <span>{listing.price ? listing.price.toLocaleString() : 'N/A'}</span>
                        <span className="text-sm sm:text-base font-bold">MRU</span>
                        {listing.op_type === 'rent' && (
                            <span className="text-xs sm:text-sm font-normal text-gray-500">{t('month')}</span>
                        )}
                    </div>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4">
                    {/* Main details */}
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-gray-600">
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
                        {listing.visit_count && listing.visit_count > 0 && (
                            <span className="flex items-center gap-1.5 text-gray-500">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span className="text-xs">{listing.visit_count}</span>
                            </span>
                        )}
                    </div>

                    {/* Location & Category badges */}
                    {(listing.region || listing.category || listing.sub_category) && (
                        <div className="flex flex-wrap items-center gap-2">
                            {listing.region && (
                                <span className="px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-md">
                                    {listing.region}
                                </span>
                            )}
                            {listing.sub_category && (
                                <span className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md">
                                    {listing.sub_category}
                                </span>
                            )}
                            {listing.lotissement && (
                                <span className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded-md truncate max-w-[120px]" title={listing.lotissement}>
                                    {listing.lotissement}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Action Button - Hidden when hideActionButton is true (e.g., in my-listings page) */}
                {!hideActionButton && (
                    <Link
                        href={`/listings/${listing.id}`}
                        className="block w-full px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-center text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm"
                    >
                        {t('view') || 'Voir les détails'}
                    </Link>
                )}
            </div>
        </div>
    );
}

