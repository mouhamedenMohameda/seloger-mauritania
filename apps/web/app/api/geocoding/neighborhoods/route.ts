import { NextResponse } from 'next/server';
import { searchNeighborhoods, NOUAKCHOTT_NEIGHBORHOODS } from '@/lib/geocoding';
import { withRateLimit, RATE_LIMITS } from '@/lib/api-middleware';

export async function GET(request: Request) {
    return withRateLimit(
        request,
        RATE_LIMITS.READ,
        async (req) => {
            const { searchParams } = new URL(req.url);
            const query = searchParams.get('q') || '';

            if (!query || query.length < 1) {
                // Return all neighborhoods if no query
                return NextResponse.json({
                    neighborhoods: NOUAKCHOTT_NEIGHBORHOODS,
                });
            }

            const results = searchNeighborhoods(query);

            return NextResponse.json({
                neighborhoods: results,
            });
        }
    );
}

