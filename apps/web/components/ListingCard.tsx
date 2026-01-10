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
        <div className={`group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ease-out-expo ${className}`}>
            {/* Image Section */}
            <Link href={`/listings/${listing.id}`} className="block relative aspect-[4/3] bg-gray-100 overflow-hidden">
                {photoUrl ? (
                    <>
                        <Image
                            src={photoUrl}
                            alt={listing.title || t('property') || 'Property'}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out-expo"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            unoptimized={photoUrl.includes('s3.amazonaws.com') || photoUrl.includes('s3.') || photoUrl.includes('supabase.co')}
                        />
                        {/* Gradient Overlay for depth */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg className="w-16 h-16 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}

                {/* Overlay badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg backdrop-blur-md border border-white/20 ${listing.op_type === 'rent'
                            ? 'bg-primary text-white'
                            : 'bg-green-500 text-white'
                        }`}>
                        {listing.op_type === 'rent' ? t('forRent') : t('forSale')}
                    </span>
                    {showStatus && listing.status && (
                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg backdrop-blur-md border border-white/10 ${listing.status === 'published'
                                ? 'bg-green-500/90 text-white'
                                : listing.status === 'draft'
                                    ? 'bg-warning/90 text-white'
                                    : 'bg-gray-600/90 text-white'
                            }`}>
                            {listing.status === 'published' ? t('published') : listing.status === 'draft' ? t('draft') : t('archived')}
                        </span>
                    )}
                </div>

                {/* Favorite button overlay */}
                {showFavorite && (
                    <div className="absolute top-4 right-4 focus-within:opacity-100">
                        <FavoriteButton listingId={listing.id} size="md" />
                    </div>
                )}
            </Link>

            {/* Content Section */}
            <div className="p-5 sm:p-6">
                {/* Title */}
                <Link href={`/listings/${listing.id}`}>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary transition-colors leading-tight min-h-[3rem]">
                        {listing.title || t('untitledListing')}
                    </h3>
                </Link>

                {/* Price */}
                <div className="mb-4">
                    <div className="text-2xl sm:text-3xl font-black text-primary tracking-tight flex items-baseline gap-1.5" dir="ltr">
                        <span>{listing.price ? listing.price.toLocaleString() : 'N/A'}</span>
                        <span className="text-xs sm:text-sm font-black opacity-80 uppercase tracking-widest">MRU</span>
                        {listing.op_type === 'rent' && (
                            <span className="text-xs font-bold text-gray-400 lowercase">{t('month')}</span>
                        )}
                    </div>
                </div>

                {/* Details */}
                <div className="space-y-4 mb-6">
                    {/* Main details with stylized icons */}
                    <div className="flex items-center gap-4 text-sm font-bold text-gray-500">
                        {listing.rooms && (
                            <span className="flex items-center gap-2 group/icon">
                                <div className="p-1.5 rounded-lg bg-gray-50 group-hover/icon:bg-primary/10 group-hover/icon:text-primary transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                    </svg>
                                </div>
                                <span>{listing.rooms} <span className="text-[11px] uppercase tracking-wider opacity-60 ml-0.5">{listing.rooms > 1 ? t('rooms') : t('room')}</span></span>
                            </span>
                        )}
                        {listing.surface && (
                            <span className="flex items-center gap-2 group/icon">
                                <div className="p-1.5 rounded-lg bg-gray-50 group-hover/icon:bg-primary/10 group-hover/icon:text-primary transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                    </svg>
                                </div>
                                <span>{listing.surface} <span className="text-[11px] uppercase tracking-wider opacity-60 ml-0.5">m²</span></span>
                            </span>
                        )}
                    </div>

                    {/* Location & Tags */}
                    {(listing.region || listing.category || listing.sub_category) && (
                        <div className="flex flex-wrap items-center gap-2">
                            {listing.region && (
                                <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 rounded-lg border border-primary/10">
                                    {listing.region}
                                </span>
                            )}
                            {listing.sub_category && (
                                <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500 bg-gray-50 rounded-lg border border-gray-100">
                                    {listing.sub_category}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Action Button */}
                {!hideActionButton && (
                    <Link
                        href={`/listings/${listing.id}`}
                        className="group/btn relative flex items-center justify-center w-full px-6 py-3 text-sm font-black uppercase tracking-[0.2em] text-white bg-primary rounded-xl hover:shadow-xl hover:shadow-primary/20 transition-all duration-300"
                    >
                        <span className="z-10">{t('view') || 'Voir'}</span>
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                    </Link>
                )}
            </div>
        </div>
    );
}

