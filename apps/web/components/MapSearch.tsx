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
            className="w-full pointer-events-auto group"
        >
            <div className={`relative flex items-center transition-all duration-500 ease-out glass-effect rounded-xl overflow-hidden group-focus-within:ring-2 group-focus-within:ring-primary/20 group-focus-within:shadow-lg ${loading ? 'opacity-90' : 'opacity-100'}`}>
                {/* Search Icon */}
                <div className="absolute inset-y-0 start-4 flex items-center pointer-events-none transition-colors duration-300">
                    <svg className={`w-4 h-4 ${loading ? 'text-primary animate-pulse' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                <input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setShowResults(true)}
                    placeholder={t('searchPlaceholder')}
                    className="block w-full ps-12 pe-10 py-3 bg-transparent border-none focus:ring-0 text-gray-900 text-sm font-semibold placeholder:text-gray-400 placeholder:font-medium leading-tight selection:bg-primary/20"
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
                        className="absolute end-1 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                        aria-label="Clear search"
                    >
                        <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Results Dropdown */}
            {showResults && hasResults && (
                <div className="absolute bottom-full mb-1.5 left-0 right-0 bg-white rounded shadow-xl border border-gray-100 overflow-hidden max-h-[40vh] overflow-y-auto z-[1000] animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Properties Section */}
                    {properties.length > 0 && (
                        <div className="p-1">
                            <h3 className="px-1.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                {t('properties')}
                            </h3>
                            {properties.map((prop) => (
                                <button
                                    key={prop.id}
                                    onClick={() => handleSelectProperty(prop)}
                                    className="w-full flex items-center gap-1.5 px-1.5 py-1.5 hover:bg-primary/5 rounded transition-colors group text-start"
                                >
                                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                                        <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-bold text-gray-900 truncate group-hover:text-primary transition-colors">{prop.title}</p>
                                        <p className="text-[10px] font-semibold text-primary">
                                            {prop.price.toLocaleString()} {t('mru')}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Divider */}
                    {properties.length > 0 && locations.length > 0 && (
                        <div className="border-t border-gray-50 my-0.5 mx-1.5" />
                    )}

                    {/* Locations Section */}
                    {locations.length > 0 && (
                        <div className="p-1">
                            <h3 className="px-1.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                {t('locations')}
                            </h3>
                            {locations.map((loc, index) => (
                                <button
                                    key={`loc-${index}`}
                                    onClick={() => handleSelectLocation(loc)}
                                    className="w-full flex items-center gap-1.5 px-1.5 py-1.5 hover:bg-gray-50 rounded transition-colors group text-start"
                                >
                                    <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-gray-200 transition-colors text-gray-500">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-semibold text-gray-900 truncate">
                                            {loc.display_name.split(',')[0]}
                                        </p>
                                        <p className="text-[10px] text-gray-500 truncate">
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
                <div className="absolute bottom-full left-0 right-0 mb-1.5 glass-effect rounded-2xl shadow-xl border-white/20 p-4 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-5 h-5 text-primary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <p className="text-sm font-bold text-gray-900 tracking-tight">{t('noListingsYet')}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{t('moveMapToFind')}</p>
                </div>
            )}
        </div>
    );
}
