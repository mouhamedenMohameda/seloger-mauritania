'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { MapSearch } from '@/components/MapSearch';
import SearchFilters, { SearchFiltersState } from '@/components/SearchFilters';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { cleanListingTitle } from '@/lib/listing-utils';
import MobileMenu from '@/components/MobileMenu';
import MobileMapControls from '@/components/MobileMapControls';
import BottomNav from '@/components/BottomNav';
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
  title: string | null; // Listing title
  op_type: 'rent' | 'sell' | null; // Operation type: rent (à louer) or sell (à vendre)
  subPolygon: number[][] | null; // Polygon coordinates [[lng, lat], [lng, lat], ...]
  subPolygonColor: string | null;
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

  // Update markers when data changes - use subPolygon center if available
  useEffect(() => {
    if (markersData?.data && Array.isArray(markersData.data)) {
      const mappedMarkers = markersData.data.map((m: any) => {
        // If sub_polygon exists, calculate its center for the marker position
        let lat = m.lat;
        let lng = m.lng;

        // Validate coordinates
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
          console.warn(`Invalid coordinates for listing ${m.id}: lat=${lat}, lng=${lng}`);
          return null; // Skip invalid listings
        }

        if (m.sub_polygon && Array.isArray(m.sub_polygon) && m.sub_polygon.length >= 3) {
          // Calculate center (centroid) of polygon
          let sumLat = 0;
          let sumLng = 0;
          let validPoints = 0;

          for (const point of m.sub_polygon) {
            if (Array.isArray(point) && point.length >= 2) {
              const [pointLng, pointLat] = point;
              if (typeof pointLat === 'number' && typeof pointLng === 'number' &&
                !isNaN(pointLat) && !isNaN(pointLng)) {
                sumLat += pointLat;
                sumLng += pointLng;
                validPoints++;
              }
            }
          }

          if (validPoints > 0) {
            lat = sumLat / validPoints;
            lng = sumLng / validPoints;
          }
        }

        return {
          id: m.id,
          lat: lat,
          lng: lng,
          price: m.price || 0,
          title: m.title || null, // Include title from API response
          op_type: m.op_type || null, // Include operation type for coloring
          subPolygon: m.sub_polygon || null,
          subPolygonColor: m.sub_polygon_color || null,
        };
      }).filter((marker): marker is Marker => marker !== null); // Remove null entries

      setMarkers(mappedMarkers);

      if (process.env.NODE_ENV === 'development') {
        console.log(`Loaded ${mappedMarkers.length} markers from ${markersData.data.length} listings`);
        if (mappedMarkers.length > 0) {
          const sample = mappedMarkers[0];
          const sampleRaw = markersData.data[0];
          console.log('Sample marker data:', {
            id: sample.id,
            title: sample.title,
            rawTitle: sampleRaw?.title,
            price: sample.price,
            hasTitle: !!sample.title,
            titleLength: sample.title?.length || 0,
          });
          // Check all markers for title
          const withoutTitle = mappedMarkers.filter(m => !m.title || m.title.trim() === '');
          if (withoutTitle.length > 0) {
            console.warn(`⚠️  ${withoutTitle.length} markers without title`);
          }
        }
      }
    } else {
      setMarkers([]);
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

      {/* PERSISTENT MOBILE SEARCH (Grouped) */}
      <div className="md:hidden fixed top-20 inset-x-0 z-[1000] px-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <MobileMapControls
          showMap={showMap}
          onToggleView={() => setShowMap(!showMap)}
          onSearchClick={() => {
            // Future: open search modal or focus search
          }}
          hideToggle={true}
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
          {markers.map(m => {
            const displayTitle = cleanListingTitle(m.title, t('untitledListing') || 'Annonce sans titre');

            // Color scheme based on operation type
            const isForSale = m.op_type === 'sell';
            const isForRent = m.op_type === 'rent';

            // Colors: Green for sale (à vendre), Blue/Indigo for rent (à louer)
            const priceColor = isForSale
              ? 'text-green-600'
              : isForRent
                ? 'text-indigo-600'
                : 'text-gray-600';

            const badgeColor = isForSale
              ? 'bg-green-100 text-green-700 border-green-200'
              : isForRent
                ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                : 'bg-gray-100 text-gray-700 border-gray-200';

            const hoverBgColor = isForSale
              ? 'hover:bg-green-50/50'
              : isForRent
                ? 'hover:bg-indigo-50/50'
                : 'hover:bg-gray-50/50';

            const borderColor = isForSale
              ? 'border-l-green-500'
              : isForRent
                ? 'border-l-indigo-500'
                : 'border-l-gray-300';

            return (
              <div
                key={m.id}
                className={`p-5 ${hoverBgColor} cursor-pointer transition-all active:scale-[0.98] border-l-4 ${borderColor} bg-white shadow-sm hover:shadow-md rounded-r-lg`}
                onClick={() => handleMarkerClick(m.id)}
              >
                {/* Badge for operation type - Top right corner */}
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex-1 min-w-0">
                    {/* Title - PRIMARY display (must be visible and prominent) */}
                    <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2 leading-snug min-h-[2.5rem]">
                      {displayTitle}
                    </h3>
                  </div>
                  {/* Badge aligned to top right */}
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${badgeColor} shadow-sm flex-shrink-0 whitespace-nowrap`}>
                    {isForSale ? (t('forSale') || 'À vendre') : isForRent ? (t('forRent') || 'À louer') : (t('property') || 'Propriété')}
                  </span>
                </div>

                {/* Price - Secondary display with color coding */}
                <div className={`text-xl font-black ${priceColor} tracking-tight mb-1 flex items-baseline gap-1.5 flex-wrap`}>
                  <span className="text-2xl">{m.price.toLocaleString()}</span>
                  <span className="text-base font-semibold">MRU</span>
                  {isForRent && (
                    <span className="text-sm font-normal text-gray-500">{t('month') || '/mois'}</span>
                  )}
                </div>
                {/* Coordinates - Hidden in production, only shown in dev mode for debugging */}
                {false && process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-gray-400 mt-2 flex items-center gap-1.5 font-medium">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <span className="truncate">{m.lat.toFixed(4)}, {m.lng.toFixed(4)}</span>
                  </div>
                )}
              </div>
            );
          })}
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
      {/* IMPORTANT: z-index must be lower than mobile menu (z-[5000]) on mobile */}
      <div className={`flex-1 relative ${showMap ? 'block' : 'hidden md:block'}`} style={{ zIndex: 0 }}>
        <Map
          onBoundsChange={handleBoundsChange}
          markers={markers}
          onMarkerClick={handleMarkerClick}
        />

        {/* Desktop Search Bar - Floating at bottom */}
        <div className="hidden md:block absolute bottom-2.5 inset-x-0 z-[1000] px-4 pointer-events-none">
          <div className="pointer-events-auto max-w-[240px] mx-auto">
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
      {/* Bottom Navigation for Mobile */}
      <BottomNav
        activeTab={showMap ? 'map' : 'list'}
        onTabChange={(tab) => {
          if (tab === 'map') setShowMap(true);
          if (tab === 'list') setShowMap(false);
          if (tab === 'profile') window.location.href = '/account';
          // messages not implemented yet
        }}
      />
    </div>
  );
}
