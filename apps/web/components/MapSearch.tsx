'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useRouter } from 'next/navigation';

interface GeocodeResult {
    lat: string;
    lon: string;
    display_name: string;
}

interface PropertyResult {
    id: string;
    title: string;
    price: number;
    op_type: 'rent' | 'sell';
}

interface MapSearchProps {
    onLocationSelect?: (lng: number, lat: number) => void;
    onMenuClick?: () => void;
    onQueryChange?: (query: string) => void;
}

export function MapSearch({ onLocationSelect, onMenuClick, onQueryChange }: MapSearchProps) {
    const { t } = useLanguage();
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [locations, setLocations] = useState<GeocodeResult[]>([]);
    const [properties, setProperties] = useState<PropertyResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    // Close results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const performSearch = async (searchQuery: string) => {
        if (!searchQuery.trim() || searchQuery.length < 2) {
            setLocations([]);
            setProperties([]);
            setShowResults(false);
            return;
        }

        setLoading(true);
        try {
            // Parallel search for locations and properties
            const [geoRes, propRes] = await Promise.all([
                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=mr&bounded=1&viewbox=-17.0,16.0,-14.0,20.0`, {
                    headers: { 'User-Agent': 'SeLoger-Mauritania/1.0' }
                }),
                fetch(`/api/search/listings?q=${encodeURIComponent(searchQuery)}`)
            ]);

            const geoData = await geoRes.json();
            const propData = await propRes.json();

            setLocations(Array.isArray(geoData) ? geoData : []);
            setProperties(Array.isArray(propData.data) ? propData.data : []);
            setShowResults(true);

            if (onQueryChange) {
                onQueryChange(searchQuery);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(() => {
            performSearch(value);
        }, 300);
    };

    const handleSelectLocation = (result: GeocodeResult) => {
        setQuery(result.display_name.split(',')[0]);
        setShowResults(false);

        // Fly map to location
        if (typeof window !== 'undefined' && (window as any).__mapFlyTo) {
            (window as any).__mapFlyTo(parseFloat(result.lon), parseFloat(result.lat), 14);
        }
    };

    const handleSelectProperty = (property: PropertyResult) => {
        setQuery(property.title);
        setShowResults(false);
        router.push(`/listings/${property.id}`);
    };

    const hasResults = locations.length > 0 || properties.length > 0;

    return (
        <div
            ref={searchRef}
            className="w-full max-w-2xl mx-auto px-4 pointer-events-auto group"
        >
            <div className={`relative flex items-center transition-all duration-500 ease-out bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] group-focus-within:shadow-[0_25px_60px_-15px_rgba(79,70,229,0.2)] border border-gray-200 ps-2 ${loading ? 'opacity-90' : 'opacity-100'}`}>
                {/* Search Icon */}
                <div className="absolute inset-y-0 start-4 flex items-center pointer-events-none transition-colors duration-300">
                    <svg className={`w-6 h-6 ${loading ? 'text-indigo-600 animate-pulse' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                <input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setShowResults(true)}
                    placeholder={t('searchPlaceholder')}
                    className="block w-full ps-12 pe-12 py-4 md:py-5 bg-transparent border-none focus:ring-0 text-gray-900 text-base md:text-lg font-bold placeholder:text-gray-400 placeholder:font-medium"
                />

                {query && (
                    <button
                        onClick={() => {
                            setQuery('');
                            setLocations([]);
                            setProperties([]);
                            setShowResults(false);
                            if (onQueryChange) onQueryChange('');
                        }}
                        className="absolute end-3 top-1/2 -translate-y-1/2 p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                        aria-label="Clear search"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Results Dropdown */}
            {showResults && hasResults && (
                <div className="absolute top-full inset-x-4 mt-3 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-h-[70vh] overflow-y-auto z-[1000] animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Properties Section */}
                    {properties.length > 0 && (
                        <div className="p-2">
                            <h3 className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                {t('properties')}
                            </h3>
                            {properties.map((prop) => (
                                <button
                                    key={prop.id}
                                    onClick={() => handleSelectProperty(prop)}
                                    className="w-full flex items-center gap-3 px-3 py-3 hover:bg-indigo-50/50 rounded-xl transition-colors group text-start"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-200 transition-colors">
                                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{prop.title}</p>
                                        <p className="text-xs font-semibold text-indigo-600">
                                            {prop.price.toLocaleString()} {t('mru')}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Divider */}
                    {properties.length > 0 && locations.length > 0 && (
                        <div className="border-t border-gray-50 my-1 mx-4" />
                    )}

                    {/* Locations Section */}
                    {locations.length > 0 && (
                        <div className="p-2">
                            <h3 className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                {t('locations')}
                            </h3>
                            {locations.map((loc, index) => (
                                <button
                                    key={`loc-${index}`}
                                    onClick={() => handleSelectLocation(loc)}
                                    className="w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 rounded-xl transition-colors group text-start"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-gray-200 transition-colors text-gray-500">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">
                                            {loc.display_name.split(',')[0]}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {loc.display_name.split(',').slice(1).join(',').trim()}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {showResults && query && !loading && !hasResults && (
                <div className="absolute top-full inset-x-4 mt-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-100 p-8 text-center animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <p className="text-base font-bold text-gray-900">{t('noListingsYet')}</p>
                    <p className="text-sm text-gray-500 mt-1">{t('moveMapToFind')}</p>
                </div>
            )}
        </div>
    );
}
