'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapProps {
    onBoundsChange?: (bounds: [number, number, number, number]) => void;
    markers?: { id: string; lat: number; lng: number; price: number }[];
    onMarkerClick?: (id: string) => void;
    onSearch?: (query: string) => void;
}

export default function Map({ onBoundsChange, markers = [], onMarkerClick, onSearch }: MapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<maplibregl.Marker[]>([]);
    const onBoundsChangeRef = useRef(onBoundsChange);
    const onMarkerClickRef = useRef(onMarkerClick);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const initializedRef = useRef(false);

    // Update refs when callbacks change
    useEffect(() => {
        onBoundsChangeRef.current = onBoundsChange;
        onMarkerClickRef.current = onMarkerClick;
    }, [onBoundsChange, onMarkerClick]);

    // Clear markers helper
    const clearMarkers = useCallback(() => {
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];
    }, []);

    // Initialize map only once
    useEffect(() => {
        if (initializedRef.current || map.current) return;
        if (!mapContainer.current) return;

        initializedRef.current = true;

        try {
            map.current = new maplibregl.Map({
                container: mapContainer.current,
                style: {
                    version: 8,
                    sources: {
                        'raster-tiles': {
                            type: 'raster',
                            tiles: [
                                'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
                            ],
                            tileSize: 256,
                            attribution: '© OpenStreetMap contributors'
                        }
                    },
                    layers: [
                        {
                            id: 'simple-tiles',
                            type: 'raster',
                            source: 'raster-tiles',
                            minzoom: 0,
                            maxzoom: 22
                        }
                    ]
                },
                center: [-15.95, 18.07], // Nouakchott
                zoom: 12,
                maxZoom: 18,
                minZoom: 8,
            });

            map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

            map.current.on('load', () => {
                setLoaded(true);
                setError(null);
                // Trigger initial bounds
                if (map.current && onBoundsChangeRef.current) {
                    const bounds = map.current.getBounds();
                    onBoundsChangeRef.current([
                        bounds.getWest(),
                        bounds.getSouth(),
                        bounds.getEast(),
                        bounds.getNorth(),
                    ]);
                }
            });

            map.current.on('error', (e) => {
                console.error('Map error:', e);
                setError('Failed to load map');
            });

            map.current.on('moveend', () => {
                if (!map.current || !loaded) return;
                const bounds = map.current.getBounds();
                if (onBoundsChangeRef.current) {
                    onBoundsChangeRef.current([
                        bounds.getWest(),
                        bounds.getSouth(),
                        bounds.getEast(),
                        bounds.getNorth(),
                    ]);
                }
            });

            // Resize map when container size changes
            const resizeObserver = new ResizeObserver(() => {
                if (map.current) {
                    map.current.resize();
                }
            });

            if (mapContainer.current) {
                resizeObserver.observe(mapContainer.current);
            }

            return () => {
                resizeObserver.disconnect();
            };
        } catch (err) {
            console.error('Error initializing map:', err);
            setError('Failed to initialize map');
            initializedRef.current = false;
        }

        return () => {
            // Don't remove map on cleanup, only on unmount
        };
    }, []); // Empty deps - initialize only once

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearMarkers();
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
            initializedRef.current = false;
        };
    }, [clearMarkers]);

    // Update markers
    useEffect(() => {
        if (!map.current || !loaded) return;

        // Clear existing markers
        clearMarkers();

        // Add new markers
        markers.forEach(marker => {
            const el = document.createElement('div');
            el.className = 'map-marker bg-white px-3 py-1.5 rounded-xl shadow-lg text-xs font-bold border-2 border-blue-500 cursor-pointer hover:bg-blue-50 hover:shadow-xl hover:scale-110 transition-all';
            el.style.width = 'auto';
            el.style.whiteSpace = 'nowrap';
            el.style.color = '#1e40af';
            el.innerText = `${marker.price.toLocaleString()} MRU`;

            el.addEventListener('click', (e) => {
                e.stopPropagation();
                if (onMarkerClickRef.current) {
                    onMarkerClickRef.current(marker.id);
                }
            });

            const mapMarker = new maplibregl.Marker({ 
                element: el,
                anchor: 'bottom'
            })
                .setLngLat([marker.lng, marker.lat])
                .addTo(map.current!);

            markersRef.current.push(mapMarker);
        });

    }, [markers, loaded, clearMarkers]);

    // Expose search function to parent via ref (we'll use a different approach)
    const flyToLocation = useCallback((lng: number, lat: number, zoom: number = 14) => {
        if (!map.current) return;
        map.current.flyTo({
            center: [lng, lat],
            zoom: zoom,
            duration: 1500,
            essential: true
        });
    }, []);

    // Expose flyToLocation via window for search component (temporary, better would be context)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).__mapFlyTo = flyToLocation;
        }
        return () => {
            if (typeof window !== 'undefined') {
                delete (window as any).__mapFlyTo;
            }
        };
    }, [flyToLocation]);

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-gray-700 font-medium mb-2">Map Error</p>
                    <p className="text-sm text-gray-500">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={mapContainer} className="w-full h-full min-h-[400px]" />
    );
}
