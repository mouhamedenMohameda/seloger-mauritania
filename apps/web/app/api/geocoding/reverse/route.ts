import { NextResponse } from 'next/server';
import { reverseGeocode } from '@/lib/geocoding';
import { withRateLimit, RATE_LIMITS } from '@/lib/api-middleware';

export async function GET(request: Request) {
    return withRateLimit(
        request,
        RATE_LIMITS.READ,
        async (req) => {
            const { searchParams } = new URL(req.url);
            const lat = parseFloat(searchParams.get('lat') || '');
            const lng = parseFloat(searchParams.get('lng') || '');

            if (isNaN(lat) || isNaN(lng)) {
                return NextResponse.json(
                    { error: 'Invalid coordinates. lat and lng are required.' },
                    { status: 400 }
                );
            }

            // Validate coordinate ranges
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                return NextResponse.json(
                    { error: 'Coordinates out of valid range.' },
                    { status: 400 }
                );
            }

            const result = await reverseGeocode(lat, lng);

            if (!result) {
                return NextResponse.json(
                    { error: 'Reverse geocoding failed' },
                    { status: 500 }
                );
            }

            return NextResponse.json(result);
        }
    );
}

