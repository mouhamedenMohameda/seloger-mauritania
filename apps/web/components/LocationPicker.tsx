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
    const [coordinatesInput, setCoordinatesInput] = useState('');
    const [inputError, setInputError] = useState<string | null>(null);
    const [currentLat, setCurrentLat] = useState(initialLat);
    const [currentLng, setCurrentLng] = useState(initialLng);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);

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
                        setCurrentLat(lngLat.lat);
                        setCurrentLng(lngLat.lng);
                        onLocationChangeRef.current(lngLat.lat, lngLat.lng);
                    });
                }

                // Move marker on map click
                map.current!.on('click', (e) => {
                    if (marker.current) {
                        marker.current.setLngLat(e.lngLat);
                        setCurrentLat(e.lngLat.lat);
                        setCurrentLng(e.lngLat.lng);
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

    // Update current coordinates and marker when initial values change
    useEffect(() => {
        setCurrentLat(initialLat);
        setCurrentLng(initialLng);
        
        // Update marker position if map is loaded
        if (map.current && marker.current && loaded) {
            marker.current.setLngLat([initialLng, initialLat]);
            map.current.flyTo({
                center: [initialLng, initialLat],
                zoom: map.current.getZoom(),
                duration: 500
            });
        }
    }, [initialLat, initialLng, loaded]);

    // Handle coordinate input paste
    const handleCoordinateInput = (value: string) => {
        setCoordinatesInput(value);
        setInputError(null);
    };

    const handleApplyCoordinates = () => {
        const trimmed = coordinatesInput.trim();
        if (!trimmed) {
            setInputError(t('coordinatesRequired') || 'Veuillez entrer les coordonnées');
            return;
        }

        // Parse coordinates: support formats like "18.103614, -15.971249" or "18.103614,-15.971249"
        const parts = trimmed.split(',').map(part => part.trim());
        if (parts.length !== 2) {
            setInputError(t('invalidCoordinatesFormat') || 'Format invalide. Utilisez: latitude, longitude');
            return;
        }

        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);

        // Validate coordinates
        if (isNaN(lat) || isNaN(lng)) {
            setInputError(t('invalidCoordinatesFormat') || 'Format invalide. Utilisez: latitude, longitude');
            return;
        }

        if (lat < -90 || lat > 90) {
            setInputError(t('invalidLatitude') || 'La latitude doit être entre -90 et 90');
            return;
        }

        if (lng < -180 || lng > 180) {
            setInputError(t('invalidLongitude') || 'La longitude doit être entre -180 et 180');
            return;
        }

        // Update map and marker
        setCurrentLat(lat);
        setCurrentLng(lng);
        setInputError(null);
        setCoordinatesInput('');

        // Update marker if map is loaded
        if (map.current && marker.current && loaded) {
            marker.current.setLngLat([lng, lat]);
            map.current.flyTo({
                center: [lng, lat],
                zoom: 15,
                duration: 1000
            });
        }

        // Update parent
        onLocationChangeRef.current(lat, lng);
    };

    const handleOpenGoogleMaps = () => {
        const googleMapsUrl = `https://www.google.com/maps?q=${currentLat},${currentLng}`;
        window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
    };

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            setLocationError(t('geolocationNotSupported') || 'La géolocalisation n\'est pas supportée par votre navigateur');
            return;
        }

        setIsGettingLocation(true);
        setLocationError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // Update current coordinates
                setCurrentLat(lat);
                setCurrentLng(lng);
                setIsGettingLocation(false);

                // Update marker if map is loaded
                if (map.current && marker.current && loaded) {
                    marker.current.setLngLat([lng, lat]);
                    map.current.flyTo({
                        center: [lng, lat],
                        zoom: 15,
                        duration: 1000
                    });
                }

                // Update parent
                onLocationChangeRef.current(lat, lng);

                // Clear any previous errors
                setInputError(null);
            },
            (error) => {
                setIsGettingLocation(false);
                let errorMessage = t('geolocationError') || 'Erreur lors de la récupération de la position';

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = t('geolocationPermissionDenied') || 'Permission de géolocalisation refusée. Veuillez autoriser l\'accès à votre position dans les paramètres de votre navigateur.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = t('geolocationUnavailable') || 'Position indisponible. Vérifiez que votre GPS est activé.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = t('geolocationTimeout') || 'Délai d\'attente dépassé lors de la récupération de la position.';
                        break;
                }

                setLocationError(errorMessage);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    return (
        <div className="relative space-y-3">
            {/* Coordinates Input and Location Buttons */}
            <div className="space-y-3">
                {/* Action Buttons Row */}
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={handleGetCurrentLocation}
                        disabled={isGettingLocation}
                        className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap flex items-center justify-center gap-2"
                    >
                        {isGettingLocation ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                <span>{t('gettingLocation') || 'Localisation...'}</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>{t('useCurrentLocation') || 'Ma position'}</span>
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={handleOpenGoogleMaps}
                        className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors whitespace-nowrap flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        {t('openInGoogleMaps') || 'Google Maps'}
                    </button>
                </div>

                {/* Coordinates Input */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        {t('coordinatesInput') || 'Coordonnées (latitude, longitude)'}
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={coordinatesInput}
                            onChange={(e) => handleCoordinateInput(e.target.value)}
                            placeholder={t('coordinatesPlaceholder') || 'Ex: 18.103614, -15.971249'}
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleApplyCoordinates();
                                }
                            }}
                        />
                        <button
                            type="button"
                            onClick={handleApplyCoordinates}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors whitespace-nowrap"
                        >
                            {t('apply') || 'Appliquer'}
                        </button>
                    </div>
                    {inputError && (
                        <p className="mt-1 text-xs text-red-600">{inputError}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                        {t('coordinatesHint') || 'Collez les coordonnées au format: latitude, longitude'}
                    </p>
                </div>

                {locationError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-xs text-red-800">{locationError}</p>
                    </div>
                )}
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-md">
                    <div className="flex items-center gap-2 text-sm">
                        <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div className="flex-1">
                            <span className="font-semibold text-slate-900 block mb-0.5">{t('currentCoordinates') || 'Coordonnées actuelles:'}</span>
                            <span className="font-mono text-sm font-bold text-primary/90 bg-white px-2 py-1 rounded border border-primary/20 inline-block">{currentLat.toFixed(6)}, {currentLng.toFixed(6)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Map */}
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
