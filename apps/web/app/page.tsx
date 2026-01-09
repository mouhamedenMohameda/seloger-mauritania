'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { MapSearch } from '@/components/MapSearch';
import SearchFilters, { SearchFiltersState } from '@/components/SearchFilters';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import MobileMenu from '@/components/MobileMenu';
import MobileMapControls from '@/components/MobileMapControls';
import { useSearchMarkers } from '@/lib/hooks/use-listings';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center text-gray-400">...</div>
});

interface Marker {
  id: string;
  lat: number;
  lng: number;
  price: number;
}

export default function Home() {
  const [bbox, setBbox] = useState<[number, number, number, number] | null>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFiltersState>({ sortBy: 'date_desc' });
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useLanguage();

  const { data: markersData, isLoading: markersLoading } = useSearchMarkers({
    bbox: bbox ? bbox.join(',') : '0,0,0,0',
    q: searchQuery,
    limit: 100, // Max markers on map
    offset: 0,
    enabled: !!bbox, // Only fetch when bbox is set
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    minRooms: filters.minRooms,
    maxRooms: filters.maxRooms,
    minSurface: filters.minSurface,
    maxSurface: filters.maxSurface,
    opType: filters.opType,
    sortBy: filters.sortBy,
  });

  // Update markers when data changes
  useEffect(() => {
    if (markersData?.data) {
      setMarkers(markersData.data.map((m: any) => ({
        id: m.id,
        lat: m.lat,
        lng: m.lng,
        price: m.price,
      })));
    }
  }, [markersData]);

  useEffect(() => {
    setLoading(markersLoading);
  }, [markersLoading]);

  // Bbox changes are handled by React Query automatically via queryKey

  const handleBoundsChange = useCallback((newBounds: [number, number, number, number]) => {
    setBbox(newBounds);
  }, []);

  const handleMarkerClick = (id: string) => {
    // Navigate to listing detail
    window.location.href = `/listings/${id}`;
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col md:flex-row relative overflow-hidden bg-white">

      {/* PERSISTENT MOBILE CONTROLS (Grouped) */}
      <div className="md:hidden fixed top-20 inset-x-0 z-[1000] px-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <MobileMapControls
          showMap={showMap}
          onToggleView={() => setShowMap(!showMap)}
          onSearchClick={() => {
            // Future: open search modal or focus search
          }}
        />
      </div>

      {/* List View */}
      <div className={`w-full md:w-1/3 bg-white border-r border-gray-200 overflow-y-auto ${!showMap ? 'block' : 'hidden md:block'}`}>
        {/* Responsive padding to avoid floating mobile search bar */}
        <div className="md:hidden h-24" />

        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">raDar {t('myListings')}</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {t('filters') || 'Filtres'}
            </button>
            <span className="text-sm font-black text-white bg-indigo-600 px-3 py-1 rounded-full shadow-lg shadow-indigo-200">{markers.length}</span>
          </div>
        </div>
        <div className="divide-y divide-gray-100 pb-32">
          {markers.map(m => (
            <div key={m.id} className="p-5 hover:bg-indigo-50/30 cursor-pointer transition-all active:scale-[0.98]" onClick={() => handleMarkerClick(m.id)}>
              <div className="font-black text-indigo-600 text-xl tracking-tight">{m.price.toLocaleString()} {t('mru')}</div>
              <div className="text-sm text-gray-500 mt-2 flex items-center gap-1.5 font-medium">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                </div>
                {m.lat.toFixed(4)}, {m.lng.toFixed(4)}
              </div>
            </div>
          ))}
          {loading ? (
            <LoadingState message={t('searching') || 'Recherche...'} />
          ) : markers.length === 0 ? (
            <EmptyState
              title={t('noListingsYet') || 'Aucune annonce'}
              message={t('moveMapToFind') || 'Déplacez la carte pour explorer les annonces'}
            />
          ) : null}
        </div>
      </div>

      {/* Map View */}
      <div className={`flex-1 relative ${showMap ? 'block' : 'hidden md:block'}`}>
        <Map
          onBoundsChange={handleBoundsChange}
          markers={markers}
          onMarkerClick={handleMarkerClick}
        />

        {/* Desktop Search Bar */}
        <div className="hidden md:block absolute top-6 inset-x-0 md:start-6 md:inset-x-auto z-[1000] px-4 pointer-events-none">
          <div className="pointer-events-auto">
            <MapSearch onQueryChange={setSearchQuery} />
          </div>
        </div>

        {/* Filters Modal */}
        {showFilters && (
          <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4" onClick={() => setShowFilters(false)}>
            <div onClick={(e) => e.stopPropagation()}>
              <SearchFilters
                filters={filters}
                onChange={setFilters}
                onClose={() => setShowFilters(false)}
              />
            </div>
          </div>
        )}

        {loading && (
          <div className="absolute top-44 md:top-28 left-1/2 -translate-x-1/2 z-[1001] bg-white/95 backdrop-blur-xl px-6 py-3 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/50 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="h-4 w-4 border-2 border-indigo-600 border-t-transparent animate-spin rounded-full"></div>
            <span className="text-sm font-black text-gray-800 tracking-wide uppercase">{t('searching')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
