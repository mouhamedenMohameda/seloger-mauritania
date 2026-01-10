'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface PhotoCarouselProps {
    photos: string[];
    listingType: 'rent' | 'sell';
    title: string;
}

export default function PhotoCarousel({ photos, listingType, title }: PhotoCarouselProps) {
    const { t } = useLanguage();
    const [currentIndex, setCurrentIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-advance slides (optional)
    useEffect(() => {
        if (photos.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % photos.length);
        }, 5000); // Change slide every 5 seconds

        return () => clearInterval(interval);
    }, [photos.length]);

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
    };

    const goToSlide = (index: number) => {
        setCurrentIndex(index);
    };

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') goToPrevious();
            if (e.key === 'ArrowRight') goToNext();
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    if (!photos || photos.length === 0) {
        return (
            <div className="relative w-full h-80 sm:h-96 bg-gray-100 rounded-lg overflow-hidden">
                <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-gray-500">{t('noImageAvailable')}</p>
                    </div>
                </div>
                <div className="absolute top-4 left-4 z-10">
                    <span className={`px-3 py-1.5 rounded-md text-sm font-semibold ${listingType === 'rent'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-green-600 text-white'
                        }`}>
                        {listingType === 'rent' ? t('forRent') : t('forSale')}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-80 sm:h-96 bg-gray-100 rounded-lg overflow-hidden group" ref={containerRef}>
            {/* Image Container */}
            <div className="relative w-full h-full">
                {photos.map((url, index) => (
                    <div
                        key={index}
                        className={`absolute inset-0 transition-opacity duration-500 ${index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                            }`}
                    >
                        {/* Use next/image for remote URLs, regular img for blob/data URLs */}
                        {url.startsWith('blob:') || url.startsWith('data:') ? (
                            <img
                                src={url}
                                alt={`${title} - Photo ${index + 1}`}
                                className="w-full h-full object-cover"
                                loading={index === 0 ? 'eager' : 'lazy'}
                                onError={(e) => {
                                    console.error(`Failed to load photo ${index + 1}:`, url);
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                }}
                            />
                        ) : (
                            <Image
                                src={url}
                                alt={`${title} - Photo ${index + 1}`}
                                fill
                                className="object-cover"
                                priority={index === 0}
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw"
                                // Unoptimized for external URLs (S3) and Supabase Storage URLs
                                unoptimized={url.includes('supabase.co') || url.includes('s3.amazonaws.com') || url.includes('s3.')}
                                onError={(e) => {
                                    console.error(`Failed to load photo ${index + 1}:`, url);
                                }}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Badge */}
            <div className="absolute top-4 left-4 z-20">
                <span className={`px-3 py-1.5 rounded-md text-sm font-semibold ${listingType === 'rent'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-green-600 text-white'
                    }`}>
                    {listingType === 'rent' ? t('forRent') : t('forSale')}
                </span>
            </div>

            {/* Photo Counter */}
            {photos.length > 1 && (
                <div className="absolute top-4 right-4 z-20">
                    <span className="px-3 py-1.5 rounded-md text-sm font-semibold bg-black/50 text-white backdrop-blur-sm">
                        {currentIndex + 1} / {photos.length}
                    </span>
                </div>
            )}

            {/* Navigation Arrows */}
            {photos.length > 1 && (
                <>
                    <button
                        onClick={goToPrevious}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-20"
                        aria-label="Previous photo"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={goToNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-20"
                        aria-label="Next photo"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </>
            )}

            {/* Scroll Indicators (Dots) */}
            {photos.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                    {photos.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`h-2 rounded-full transition-all ${index === currentIndex
                                ? 'w-8 bg-white'
                                : 'w-2 bg-white/50 hover:bg-white/75'
                                }`}
                            aria-label={`Go to photo ${index + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
