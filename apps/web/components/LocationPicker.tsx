'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface LocationPickerProps {
    initialLat?: number;
    initialLng?: number;
    onLocationChange: (lat: number, lng: number) => void;
}

export default function LocationPicker({ initialLat = 18.07, initialLng = -15.95, onLocationChange }: LocationPickerProps) {
    const { t } = useLanguage();
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const marker = useRef<maplibregl.Marker | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const initializedRef = useRef(false);
    const onLocationChangeRef = useRef(onLocationChange);

    // Update callback ref
    useEffect(() => {
        onLocationChangeRef.current = onLocationChange;
    }, [onLocationChange]);

    useEffect(() => {
        if (initializedRef.current || map.current) return;
        if (!mapContainer.current) return;

        initializedRef.current = true;
        setError(null);

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
                center: [initialLng, initialLat],
                zoom: 13,
                maxZoom: 18,
                minZoom: 8,
            });

            map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

            map.current.on('load', () => {
                setLoaded(true);

                // Initialize marker after map loads
                if (!marker.current) {
                    marker.current = new maplibregl.Marker({
                        draggable: true,
                        color: '#2563eb' // Blue-600
                    })
                        .setLngLat([initialLng, initialLat])
                        .addTo(map.current!);

                    // Update parent on drag
                    marker.current.on('dragend', () => {
                        const lngLat = marker.current!.getLngLat();
                        onLocationChangeRef.current(lngLat.lat, lngLat.lng);
                    });
                }

                // Move marker on map click
                map.current!.on('click', (e) => {
                    if (marker.current) {
                        marker.current.setLngLat(e.lngLat);
                        onLocationChangeRef.current(e.lngLat.lat, e.lngLat.lng);
                    }
                });
            });

            map.current.on('error', (e) => {
                console.error('Map error:', e);
                setError(t('mapError'));
                setLoaded(false);
            });

            // Resize observer
            const resizeObserver = new ResizeObserver(() => {
                if (map.current && loaded) {
                    setTimeout(() => map.current!.resize(), 100);
                }
            });

            if (mapContainer.current) {
                resizeObserver.observe(mapContainer.current);
            }

            return () => {
                resizeObserver.disconnect();
            };
        } catch (err) {
            console.error('Error initializing location picker map:', err);
            setError(t('mapError'));
            initializedRef.current = false;
        }

        return () => {
            // Cleanup on unmount only
            if (marker.current) {
                marker.current.remove();
                marker.current = null;
            }
        };
    }, [initialLat, initialLng, t]);

    // Cleanup map on unmount
    useEffect(() => {
        return () => {
            if (marker.current) {
                marker.current.remove();
                marker.current = null;
            }
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
            initializedRef.current = false;
        };
    }, []);

    return (
        <div className="relative">
            <div className="h-80 w-full rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm bg-gray-100 relative">
                {error ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                        <div className="text-center p-4">
                            <svg className="w-12 h-12 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <p className="text-sm text-gray-700 font-medium mb-1">{t('mapError')}</p>
                            <p className="text-xs text-gray-500">{error}</p>
                        </div>
                    </div>
                ) : !loaded ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-2"></div>
                            <p className="text-sm text-gray-500">{t('loadingMap')}</p>
                        </div>
                    </div>
                ) : null}
                <div ref={mapContainer} className="w-full h-full" style={{ minHeight: '320px' }} />
                {loaded && !error && (
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md text-gray-700 pointer-events-none border border-gray-200 z-20">
                        <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {t('dragPinToSetLocation')}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
