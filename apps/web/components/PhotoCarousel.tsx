'use client';

import { useState, useEffect, useRef } from 'react';

interface PhotoCarouselProps {
    photos: string[];
    listingType: 'rent' | 'sell';
    title: string;
}

export default function PhotoCarousel({ photos, listingType, title }: PhotoCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalIndex, setModalIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-advance slides (optional) - pause when modal is open
    useEffect(() => {
        if (photos.length <= 1 || isModalOpen) return;
        
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % photos.length);
        }, 5000); // Change slide every 5 seconds

        return () => clearInterval(interval);
    }, [photos.length, isModalOpen]);

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
    };

    const goToSlide = (index: number) => {
        setCurrentIndex(index);
    };

    const openModal = (index: number) => {
        console.log('Opening modal with index:', index);
        setModalIndex(index);
        setIsModalOpen(true);
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    };

    // Update modal index when carousel index changes (if modal is closed)
    useEffect(() => {
        if (!isModalOpen) {
            setModalIndex(currentIndex);
        }
    }, [currentIndex, isModalOpen]);

    const closeModal = () => {
        setIsModalOpen(false);
        document.body.style.overflow = 'unset';
    };

    const goToModalPrevious = () => {
        setModalIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
    };

    const goToModalNext = () => {
        setModalIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
    };

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (isModalOpen) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    goToModalPrevious();
                }
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    goToModalNext();
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    closeModal();
                }
            } else {
                if (e.key === 'ArrowLeft') goToPrevious();
                if (e.key === 'ArrowRight') goToNext();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isModalOpen, photos.length]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    if (!photos || photos.length === 0) {
        return (
            <div className="relative w-full h-80 sm:h-96 bg-gray-100 rounded-lg overflow-hidden">
                <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-gray-500">No image available</p>
                    </div>
                </div>
                <div className="absolute top-4 left-4 z-10">
                    <span className={`px-3 py-1.5 rounded-md text-sm font-semibold ${
                        listingType === 'rent' 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-green-600 text-white'
                    }`}>
                        {listingType === 'rent' ? 'For Rent' : 'For Sale'}
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
                        className={`absolute inset-0 transition-opacity duration-500 cursor-zoom-in ${
                            index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                        }`}
                        onClick={(e) => {
                            e.stopPropagation();
                            console.log('Image clicked, opening modal');
                            openModal(index);
                        }}
                    >
                        <img
                            src={url}
                            alt={`${title} - Photo ${index + 1}`}
                            className="w-full h-full object-cover pointer-events-none"
                            loading={index === 0 ? 'eager' : 'lazy'}
                            draggable={false}
                            onError={(e) => {
                                console.error(`Failed to load photo ${index + 1}:`, url);
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Badge */}
            <div className="absolute top-4 left-4 z-20">
                <span className={`px-3 py-1.5 rounded-md text-sm font-semibold ${
                    listingType === 'rent' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-green-600 text-white'
                }`}>
                    {listingType === 'rent' ? 'For Rent' : 'For Sale'}
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
                        onClick={(e) => {
                            e.stopPropagation();
                            goToPrevious();
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-30"
                        aria-label="Previous photo"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            goToNext();
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-30"
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
                            className={`h-2 rounded-full transition-all ${
                                index === currentIndex
                                    ? 'w-8 bg-white'
                                    : 'w-2 bg-white/50 hover:bg-white/75'
                            }`}
                            aria-label={`Go to photo ${index + 1}`}
                        />
                    ))}
                </div>
            )}

            {/* Fullscreen Modal */}
            {isModalOpen && (
                <div 
                    className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center"
                    onClick={closeModal}
                    style={{ zIndex: 9999 }}
                >
                    {/* Close Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            closeModal();
                        }}
                        className="absolute top-4 right-4 z-[10000] bg-black/70 hover:bg-black/90 text-white p-3 rounded-full backdrop-blur-sm transition-opacity"
                        aria-label="Close"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Image Container */}
                    <div 
                        className="relative w-full h-full flex items-center justify-center p-4 md:p-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {photos.map((url, index) => (
                            <div
                                key={index}
                                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
                                    index === modalIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                                }`}
                            >
                                <img
                                    src={url}
                                    alt={`${title} - Photo ${index + 1}`}
                                    className="max-w-full max-h-full object-contain"
                                    loading="eager"
                                    onError={(e) => {
                                        console.error(`Failed to load photo ${index + 1} in modal:`, url);
                                    }}
                                />
                            </div>
                        ))}

                        {/* Navigation Arrows */}
                        {photos.length > 1 && (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        goToModalPrevious();
                                    }}
                                    className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white p-4 rounded-full backdrop-blur-sm transition-opacity z-[10000]"
                                    aria-label="Previous photo"
                                >
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        goToModalNext();
                                    }}
                                    className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white p-4 rounded-full backdrop-blur-sm transition-opacity z-[10000]"
                                    aria-label="Next photo"
                                >
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </>
                        )}

                        {/* Photo Counter */}
                        {photos.length > 1 && (
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[10000]">
                                <span className="px-4 py-2 rounded-md text-sm font-semibold bg-black/70 text-white backdrop-blur-sm">
                                    {modalIndex + 1} / {photos.length}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
