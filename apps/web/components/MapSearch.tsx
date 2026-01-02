'use client';

import { useState, useRef, useEffect } from 'react';

interface GeocodeResult {
    lat: string;
    lon: string;
    display_name: string;
}

export function MapSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<GeocodeResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

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

    const searchLocation = async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            setShowResults(false);
            return;
        }

        setLoading(true);
        try {
            // Using Nominatim (OpenStreetMap geocoding) - free and no API key needed
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=mr&bounded=1&viewbox=-17.0,16.0,-14.0,20.0`,
                {
                    headers: {
                        'User-Agent': 'SeLoger-Mauritania/1.0'
                    }
                }
            );

            if (!response.ok) throw new Error('Geocoding failed');

            const data: GeocodeResult[] = await response.json();
            setResults(data);
            setShowResults(true);
        } catch (error) {
            console.error('Geocoding error:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);

        // Debounce search
        const timeoutId = setTimeout(() => {
            searchLocation(value);
        }, 300);

        return () => clearTimeout(timeoutId);
    };

    const handleSelectResult = (result: GeocodeResult) => {
        setQuery(result.display_name);
        setShowResults(false);

        // Fly map to location
        if (typeof window !== 'undefined' && (window as any).__mapFlyTo) {
            (window as any).__mapFlyTo(parseFloat(result.lon), parseFloat(result.lat), 14);
        }
    };

    return (
        <div
            ref={searchRef}
            className="absolute top-4 left-4 w-[calc(100%-2rem)] max-w-md md:max-w-lg"
            style={{
                zIndex: 10000,
                position: 'absolute',
                top: '1rem',
                left: '1rem',
                pointerEvents: 'auto'
            }}
        >
            <div className="relative">
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={handleInputChange}
                        onFocus={() => results.length > 0 && setShowResults(true)}
                        placeholder="🔍 Search location (e.g. Nouakchott, Tevragh Zeina...)"
                        className="w-full pl-12 pr-10 py-3.5 rounded-xl border-2 border-blue-500 bg-white shadow-2xl focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 focus:outline-none text-sm font-medium text-gray-900 placeholder:text-gray-500"
                        style={{
                            backgroundColor: '#ffffff',
                            zIndex: 10001,
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        {loading ? (
                            <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        )}
                    </div>
                    {query && (
                        <button
                            onClick={() => {
                                setQuery('');
                                setResults([]);
                                setShowResults(false);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                            aria-label="Clear search"
                        >
                            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Results Dropdown */}
                {showResults && results.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden max-h-80 overflow-y-auto z-[10002]">
                        {results.map((result, index) => (
                            <button
                                key={index}
                                onClick={() => handleSelectResult(result)}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                            >
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {result.display_name.split(',')[0]}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {result.display_name.split(',').slice(1).join(',').trim()}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {showResults && query && !loading && results.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-4 text-center z-[10002]">
                        <p className="text-sm text-gray-500">No locations found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
