'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface MapProps {
    onBoundsChange?: (bounds: [number, number, number, number]) => void;
    markers?: { 
        id: string; 
        lat: number; 
        lng: number; 
        price: number;
        op_type?: 'rent' | 'sell' | null; // Operation type for coloring
        subPolygon?: number[][] | null; // Polygon coordinates [[lng, lat], [lng, lat], ...]
        subPolygonColor?: string | null;
    }[];
    onMarkerClick?: (id: string) => void;
    onSearch?: (query: string) => void;
}

export default function Map({ onBoundsChange, markers = [], onMarkerClick, onSearch }: MapProps) {
    const { t } = useLanguage();
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<maplibregl.Marker[]>([]);
    const polygonsRef = useRef<string[]>([]); // Store polygon layer IDs for cleanup
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

    // Clear markers and polygons helper
    const clearMarkers = useCallback(() => {
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];
        
        // Clear polygon layers if map exists
        if (map.current) {
            polygonsRef.current.forEach(polygonId => {
                if (map.current?.getLayer(polygonId)) {
                    map.current.removeLayer(polygonId);
                }
                if (map.current?.getSource(polygonId)) {
                    map.current.removeSource(polygonId);
                }
            });
            polygonsRef.current = [];
        }
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

            // Add custom class to the control container to offset it
            const ctrlContainer = map.current.getContainer().querySelector('.maplibregl-ctrl-top-right');
            if (ctrlContainer) ctrlContainer.classList.add('custom-map-ctrl');

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

    // Update markers and polygons
    useEffect(() => {
        if (!map.current || !loaded || !markers || markers.length === 0) {
            if (markers && markers.length === 0) {
                clearMarkers();
            }
            return;
        }

        // Clear existing markers and polygons
        clearMarkers();

        // Add new markers and polygons
        markers.forEach(marker => {
            // Validate marker data
            if (!marker || !marker.id || !marker.lat || !marker.lng || isNaN(marker.lat) || isNaN(marker.lng)) {
                console.warn('Invalid marker data:', marker);
                return;
            }
            // Add polygon if available (priority display)
            if (marker.subPolygon && Array.isArray(marker.subPolygon) && marker.subPolygon.length >= 3) {
                try {
                    const polygonId = `polygon-${marker.id}`;
                    const polygonColor = marker.subPolygonColor || '#6366f1'; // Default indigo
                    
                    // Convert subPolygon format [[lng, lat], [lng, lat], ...] to GeoJSON polygon
                    const coordinates = marker.subPolygon.map(point => {
                        if (Array.isArray(point) && point.length >= 2) {
                            return [point[0], point[1]]; // [lng, lat]
                        }
                        return [0, 0]; // Fallback
                    }).filter((coord: number[]) => coord[0] !== 0 || coord[1] !== 0);
                    
                    // Ensure polygon is closed (first point = last point)
                    if (coordinates.length > 0) {
                        const first = coordinates[0];
                        const last = coordinates[coordinates.length - 1];
                        if (first[0] !== last[0] || first[1] !== last[1]) {
                            coordinates.push([first[0], first[1]]);
                        }
                    }
                    
                    if (coordinates.length >= 4) { // At least 3 points + closing point
                        // Add polygon source
                        map.current!.addSource(polygonId, {
                            type: 'geojson',
                            data: {
                                type: 'Feature',
                                geometry: {
                                    type: 'Polygon',
                                    coordinates: [coordinates]
                                },
                                properties: {
                                    id: marker.id,
                                    price: marker.price,
                                }
                            }
                        });
                        
                        // Add polygon fill layer
                        map.current!.addLayer({
                            id: `${polygonId}-fill`,
                            type: 'fill',
                            source: polygonId,
                            paint: {
                                'fill-color': polygonColor,
                                'fill-opacity': 0.3,
                            }
                        });
                        
                        // Add polygon outline layer
                        map.current!.addLayer({
                            id: `${polygonId}-outline`,
                            type: 'line',
                            source: polygonId,
                            paint: {
                                'line-color': polygonColor,
                                'line-width': 2,
                                'line-opacity': 0.8,
                            }
                        });
                        
                        polygonsRef.current.push(`${polygonId}-fill`);
                        polygonsRef.current.push(`${polygonId}-outline`);
                        
                        // Add click handler to polygon
                        map.current!.on('click', `${polygonId}-fill`, (e) => {
                            if (onMarkerClickRef.current) {
                                onMarkerClickRef.current(marker.id);
                            }
                        });
                        
                        map.current!.on('click', `${polygonId}-outline`, (e) => {
                            if (onMarkerClickRef.current) {
                                onMarkerClickRef.current(marker.id);
                            }
                        });
                        
                        // Change cursor on hover
                        map.current!.on('mouseenter', `${polygonId}-fill`, () => {
                            if (map.current) {
                                map.current.getCanvas().style.cursor = 'pointer';
                            }
                        });
                        
                        map.current!.on('mouseleave', `${polygonId}-fill`, () => {
                            if (map.current) {
                                map.current.getCanvas().style.cursor = '';
                            }
                        });
                    }
                } catch (error) {
                    console.error(`Error adding polygon for marker ${marker.id}:`, error);
                }
            }
            
            // Add marker (point) - always add for clicking/price display
            // Position at polygon center if polygon exists, otherwise at lat/lng
            const el = document.createElement('div');
            
            // Color coding based on operation type: Green for sale, Blue/Indigo for rent
            const isForSale = marker.op_type === 'sell';
            const isForRent = marker.op_type === 'rent';
            const markerBgColor = isForSale 
                ? 'bg-green-600 hover:bg-green-700' 
                : isForRent 
                    ? 'bg-indigo-600 hover:bg-indigo-700' 
                    : 'bg-gray-600 hover:bg-gray-700';
            
            el.className = `map-marker ${markerBgColor} text-white px-3 py-1.5 rounded-full shadow-2xl text-xs font-black border-2 border-white cursor-pointer hover:scale-110 active:scale-95 transition-all duration-200 z-10`;
            el.style.width = 'auto';
            el.style.whiteSpace = 'nowrap';
            el.innerText = `${marker.price.toLocaleString()} ${t('mru')}`;

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

    }, [markers, loaded, clearMarkers, t]);

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
                    <p className="text-gray-700 font-bold mb-2">{t('mapError')}</p>
                    <p className="text-sm text-gray-500">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={mapContainer} 
            className="w-full h-full min-h-[400px]" 
            style={{ position: 'relative', zIndex: 0 }}
        />
    );
}
