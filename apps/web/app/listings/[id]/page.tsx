'use client';

import { notFound } from 'next/navigation'
import Link from 'next/link'
import PhotoCarousel from '@/components/PhotoCarousel'
import { useState, useEffect, use } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useListing } from '@/lib/hooks/use-listings'
import { createClient } from '@/lib/supabase/client'
import LoadingState from '@/components/ui/LoadingState'
import ErrorState from '@/components/ui/ErrorState'
import FavoriteButton from '@/components/FavoriteButton'

export default function ListingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { t, lang } = useLanguage()
    const { data: listing, isLoading, error } = useListing(id)
    const [photoUrls, setPhotoUrls] = useState<string[]>([])
    const [photosLoading, setPhotosLoading] = useState(false)
    const supabase = createClient()

    // Fetch photos when listing is loaded
    useEffect(() => {
        if (!listing) return

        setPhotosLoading(true)
        const fetchPhotos = async () => {
            try {
                const { data: photos, error: photosError } = await supabase
                    .from('listing_photos')
                    .select('*')
                    .eq('listing_id', id)
                    .order('rank', { ascending: true })

                if (photos && !photosError) {
                    const urls = photos.map(photo => {
                        if (!photo.storage_path) return null
                        const { data } = supabase.storage.from('listings').getPublicUrl(photo.storage_path)
                        return data.publicUrl
                    }).filter((url): url is string => !!url)
                    setPhotoUrls(urls)
                }
            } finally {
                setPhotosLoading(false)
            }
        }

        fetchPhotos()
    }, [listing, id, supabase])

    if (isLoading) {
        return <LoadingState fullScreen message={t('loadingListing') || 'Chargement...'} />
    }

    if (error) {
        return (
            <ErrorState
                message={error.message || t('loadFailed') || 'Échec du chargement'}
                onRetry={() => window.location.reload()}
            />
        )
    }

    if (!listing) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 rtl:flex-row-reverse">
                    <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {t('backToMap')}
                </Link>

                {/* Photo Carousel */}
                <div className="mb-6">
                    <PhotoCarousel
                        photos={photoUrls}
                        listingType={listing.op_type}
                        title={listing.title || t('property')}
                    />
                </div>

                {/* Content */}
                <div className="space-y-8">
                    {/* Title and Price Section */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-start justify-between gap-4 mb-3">
                            <h1 className="text-3xl font-bold text-gray-900">
                                {listing.title || t('untitledProperty')}
                            </h1>
                            <FavoriteButton listingId={listing.id} size="lg" />
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-4">
                            {listing.rooms && (
                                <span className="flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                    </svg>
                                    {listing.rooms} {listing.rooms > 1 ? (lang === 'ar' ? t('roomsLabel') : t('roomLabel') + 's') : t('roomLabel')}
                                </span>
                            )}
                            {listing.surface && (
                                <span className="flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                    </svg>
                                    {listing.surface} m²
                                </span>
                            )}
                        </div>
                        <div className="text-3xl font-bold text-indigo-600 flex items-center gap-2">
                            <span dir="ltr">{listing.price ? listing.price.toLocaleString() : 'N/A'}</span>
                            <span className="text-xl">{t('mru')}</span>
                            {listing.op_type === 'rent' && (
                                <span className="text-lg font-normal text-gray-500">{t('perMonth')}</span>
                            )}
                        </div>
                    </div>

                    {/* Description Section */}
                    {listing.description && (
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b border-gray-200">
                                {t('descriptionLabel')}
                            </h2>
                            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                {listing.description}
                            </p>
                        </div>
                    )}

                    {/* Contact Section */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b border-gray-200">
                            {t('contactLabel')}
                        </h2>
                        {listing.profiles?.phone ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center font-semibold text-indigo-700 text-lg">
                                        {listing.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">
                                            {listing.profiles?.full_name || t('unknownUser')}
                                        </p>
                                    </div>
                                </div>
                                <a
                                    href={`https://wa.me/${listing.profiles.phone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                    </svg>
                                    {t('contactOnWhatsApp')}
                                </a>
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-gray-500">{t('contactNotAvailable')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
