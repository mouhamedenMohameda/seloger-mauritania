/**
 * Geocoding utilities for Phase 2.2
 */

export interface GeocodeResult {
    lat: number;
    lng: number;
    display_name: string;
    address?: {
        road?: string;
        neighbourhood?: string;
        suburb?: string;
        city?: string;
        country?: string;
    };
}

export interface ReverseGeocodeResult {
    display_name: string;
    address: {
        road?: string;
        neighbourhood?: string;
        suburb?: string;
        city?: string;
        country?: string;
    };
}

/**
 * Reverse geocoding: Convert coordinates to address
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'SeLoger-Mauritania/1.0',
                },
            }
        );

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        
        return {
            display_name: data.display_name || `${lat}, ${lng}`,
            address: data.address || {},
        };
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
}

/**
 * Nouakchott neighborhoods list (Mauritanian context)
 */
export const NOUAKCHOTT_NEIGHBORHOODS = [
    { name: 'Tevragh Zeina', lat: 18.086, lng: -15.975, displayName: 'Tevragh Zeina, Nouakchott' },
    { name: 'Arafat', lat: 18.045, lng: -15.970, displayName: 'Arafat, Nouakchott' },
    { name: 'El Mina', lat: 18.095, lng: -15.980, displayName: 'El Mina, Nouakchott' },
    { name: 'Ksar', lat: 18.080, lng: -15.965, displayName: 'Ksar, Nouakchott' },
    { name: 'Teyarett', lat: 18.070, lng: -15.960, displayName: 'Teyarett, Nouakchott' },
    { name: 'Toujounine', lat: 18.055, lng: -15.975, displayName: 'Toujounine, Nouakchott' },
    { name: 'Sebkha', lat: 18.040, lng: -15.985, displayName: 'Sebkha, Nouakchott' },
    { name: 'Dar Naim', lat: 18.100, lng: -15.955, displayName: 'Dar Naim, Nouakchott' },
    { name: 'Riyadh', lat: 18.090, lng: -15.950, displayName: 'Riyadh, Nouakchott' },
    { name: 'Tevragh Zeina Ouest', lat: 18.085, lng: -15.990, displayName: 'Tevragh Zeina Ouest, Nouakchott' },
] as const;

/**
 * Search neighborhoods by query (fuzzy match)
 */
export function searchNeighborhoods(query: string): typeof NOUAKCHOTT_NEIGHBORHOODS[number][] {
    if (!query || query.length < 2) {
        return [];
    }

    const lowerQuery = query.toLowerCase();
    
    return NOUAKCHOTT_NEIGHBORHOODS.filter(neighborhood => 
        neighborhood.name.toLowerCase().includes(lowerQuery) ||
        neighborhood.displayName.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Get neighborhood by name (exact match)
 */
export function getNeighborhoodByName(name: string): typeof NOUAKCHOTT_NEIGHBORHOODS[number] | undefined {
    return NOUAKCHOTT_NEIGHBORHOODS.find(n => 
        n.name.toLowerCase() === name.toLowerCase() ||
        n.displayName.toLowerCase() === name.toLowerCase()
    );
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

