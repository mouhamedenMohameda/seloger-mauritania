'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { MapSearch } from '@/components/MapSearch';
import { debounce } from '@/lib/utils';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center text-gray-400">Loading Map...</div>
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

  const fetchListings = useCallback(async (bounds: [number, number, number, number]) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        bbox: bounds.join(','),
      });

      const res = await fetch(`/api/search/markers?${query}`);
      if (!res.ok) throw new Error('Failed to fetch listings');
      
      const data = await res.json();
      if (Array.isArray(data)) {
        setMarkers(data);
      }
    } catch (err) {
      console.error('Error fetching listings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedFetch = useCallback(
    debounce((bounds: [number, number, number, number]) => {
      fetchListings(bounds);
    }, 500),
    [fetchListings]
  );

  useEffect(() => {
    if (!bbox) return;
    debouncedFetch(bbox);
  }, [bbox, debouncedFetch]);

  const handleBoundsChange = useCallback((newBounds: [number, number, number, number]) => {
    setBbox(newBounds);
  }, []);

  const handleMarkerClick = (id: string) => {
    // Navigate to listing detail
    window.location.href = `/listings/${id}`;
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col md:flex-row relative">
      {/* List View (Mobile: Hidden if map active, Desktop: Left user) */}
      <div className="w-full md:w-1/3 bg-white border-r border-gray-200 overflow-y-auto hidden md:block">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h1 className="text-lg font-bold">Listings in view</h1>
          <span className="text-sm text-gray-500">{markers.length} results</span>
        </div>
        <div className="divide-y divide-gray-100">
          {markers.map(m => (
            <div key={m.id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => handleMarkerClick(m.id)}>
              <div className="font-bold text-indigo-600">{m.price.toLocaleString()} MRU</div>
              <div className="text-sm text-gray-500">Coordinates: {m.lat.toFixed(4)}, {m.lng.toFixed(4)}</div>
            </div>
          ))}
          {markers.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-500">
              Move the map to find listings
            </div>
          )}
        </div>
      </div>

      {/* Map View */}
      <div className="flex-1 relative">
        <Map
          onBoundsChange={handleBoundsChange}
          markers={markers}
          onMarkerClick={handleMarkerClick}
        />
        <MapSearch />
        {loading && (
          <div className="absolute top-20 left-4 z-[1001] bg-white px-4 py-2 rounded-xl shadow-lg border border-gray-200 flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
            <span className="text-sm font-medium text-gray-700">Searching...</span>
          </div>
        )}
      </div>
    </div>
  );
}
