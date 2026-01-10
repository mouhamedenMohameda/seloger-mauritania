import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { searchListings, SearchFiltersSchema } from '@seloger/geo'
import { withRateLimit, RATE_LIMITS } from '@/lib/api-middleware'

export async function GET(request: Request) {
    return withRateLimit(
        request,
        RATE_LIMITS.READ,
        async (req, context) => {
            const { searchParams } = new URL(req.url)

            const filtersRaw = {
                minLng: searchParams.get('bbox')?.split(',')[0],
                minLat: searchParams.get('bbox')?.split(',')[1],
                maxLng: searchParams.get('bbox')?.split(',')[2],
                maxLat: searchParams.get('bbox')?.split(',')[3],
                q: searchParams.get('q') || undefined,
                minPrice: searchParams.get('minPrice') || undefined,
                maxPrice: searchParams.get('maxPrice') || undefined,
                minRooms: searchParams.get('minRooms') || undefined,
                maxRooms: searchParams.get('maxRooms') || undefined,
                minSurface: searchParams.get('minSurface') || undefined,
                maxSurface: searchParams.get('maxSurface') || undefined,
                opType: searchParams.get('opType') || undefined,
                sortBy: searchParams.get('sortBy') || 'date_desc',
                // Pagination - REQUIRED (defaults provided by schema)
                limit: searchParams.get('limit') || '50',
                offset: searchParams.get('offset') || '0',
            }

            const validation = SearchFiltersSchema.safeParse(filtersRaw)

            if (!validation.success) {
                return NextResponse.json({ error: 'Invalid filters', details: validation.error.errors }, { status: 400 })
            }

            const supabase = await createClient()
            let data: any[] | null = null;
            let error: any = null;

            // Try to call search_listings RPC function
            const rpcResult = await searchListings(supabase, validation.data);

            if (rpcResult.error) {
                error = rpcResult.error;
                const { logger } = await import('@/lib/logger')
                logger.error('Search listings error', error, { ip: context.ip })
                console.error('Search listings RPC error:', error)
                console.error('Error details:', JSON.stringify(error, null, 2))

                // Check if error is due to function ambiguity (multiple versions exist)
                const errorMessage = error?.message || String(error);
                if (errorMessage.includes('Could not choose the best candidate function') || errorMessage.includes('ambiguous')) {
                    console.error('⚠️  PROBLÈME: Ambiguïté dans la fonction search_listings - plusieurs versions existent!');
                    console.error('📋 Solution: Appliquez la migration pour nettoyer les anciennes versions:');
                    console.error('      supabase/migrations/20240101000012_add_sub_polygon_to_search.sql');
                    console.error('   💡 Utilisez: ./scripts/apply-sub-polygon-migration.sh');

                    // Fallback: Use a simple direct query (temporary solution until migration is applied)
                    console.log('🔄 Utilisation d\'une requête directe simplifiée comme fallback...');
                    try {
                        // Use basic query without bounding box filter for now (will work but less efficient)
                        let query = supabase
                            .from('listings')
                            .select('id, owner_id, title, price, op_type, status, rooms, surface, sub_polygon, sub_polygon_color, created_at')
                            .eq('status', 'published')
                            .is('deleted_at', null);

                        if (validation.data.minPrice !== undefined) {
                            query = query.gte('price', validation.data.minPrice);
                        }
                        if (validation.data.maxPrice !== undefined) {
                            query = query.lte('price', validation.data.maxPrice);
                        }
                        if (validation.data.minRooms !== undefined) {
                            query = query.gte('rooms', validation.data.minRooms);
                        }
                        if (validation.data.maxRooms !== undefined) {
                            query = query.lte('rooms', validation.data.maxRooms);
                        }
                        if (validation.data.minSurface !== undefined) {
                            query = query.gte('surface', validation.data.minSurface);
                        }
                        if (validation.data.maxSurface !== undefined) {
                            query = query.lte('surface', validation.data.maxSurface);
                        }
                        if (validation.data.opType) {
                            query = query.eq('op_type', validation.data.opType);
                        }
                        if (validation.data.q) {
                            query = query.or(`title.ilike.%${validation.data.q}%,description.ilike.%${validation.data.q}%`);
                        }

                        // Apply sorting
                        if (validation.data.sortBy === 'price_asc') {
                            query = query.order('price', { ascending: true });
                        } else if (validation.data.sortBy === 'price_desc') {
                            query = query.order('price', { ascending: false });
                        } else if (validation.data.sortBy === 'date_asc') {
                            query = query.order('created_at', { ascending: true });
                        } else if (validation.data.sortBy === 'surface_asc') {
                            query = query.order('surface', { ascending: true, nullsFirst: false });
                        } else if (validation.data.sortBy === 'surface_desc') {
                            query = query.order('surface', { ascending: false, nullsFirst: false });
                        } else {
                            query = query.order('created_at', { ascending: false });
                        }

                        query = query.range(validation.data.offset, validation.data.offset + validation.data.limit - 1);

                        const { data: listingsData, error: listingsError } = await query;

                        if (listingsError) {
                            console.error('Erreur requête directe:', listingsError);
                        } else if (listingsData) {
                            // Extract coordinates and calculate polygon centers
                            const listingsWithCoords = await Promise.all(listingsData.map(async (listing: any) => {
                                let lat: number | null = null;
                                let lng: number | null = null;

                                // Priority: Use sub_polygon center if available
                                if (listing.sub_polygon && Array.isArray(listing.sub_polygon) && listing.sub_polygon.length >= 3) {
                                    let sumLat = 0;
                                    let sumLng = 0;
                                    let validPoints = 0;

                                    for (const point of listing.sub_polygon) {
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

                                // Fallback: Extract from location using helper function or direct query
                                if (!lat || !lng) {
                                    try {
                                        // Try helper function first
                                        const { data: coordsData, error: coordsError } = await supabase
                                            .rpc('extract_listing_coords', { listing_id_param: listing.id })
                                            .single();

                                        if (!coordsError && coordsData) {
                                            const coords = coordsData as { lat: number; lng: number };
                                            lat = coords.lat;
                                            lng = coords.lng;
                                        } else {
                                            // If helper doesn't exist, use a workaround with raw SQL query
                                            // For now, use default coordinates and log a warning
                                            console.warn(`Could not extract coordinates for listing ${listing.id}, using default`);
                                        }
                                    } catch (e) {
                                        // Ignore errors, will use default coordinates
                                        console.warn(`Error extracting coordinates for listing ${listing.id}:`, e);
                                    }
                                }

                                // Default coordinates if still not found
                                if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
                                    lat = 18.0735; // Default Nouakchott
                                    lng = -15.9582;
                                }

                                // Get photos count
                                const { count: photosCount } = await supabase
                                    .from('listing_photos')
                                    .select('*', { count: 'exact', head: true })
                                    .eq('listing_id', listing.id);

                                return {
                                    id: listing.id,
                                    owner_id: listing.owner_id,
                                    title: listing.title || null,
                                    price: listing.price || 0,
                                    op_type: listing.op_type || null, // Include op_type for coloring
                                    status: listing.status || 'published',
                                    rooms: listing.rooms || null,
                                    surface: listing.surface || null,
                                    lat,
                                    lng,
                                    photos_count: photosCount || 0,
                                    created_at: listing.created_at || new Date().toISOString(),
                                    sub_polygon: listing.sub_polygon || null,
                                    sub_polygon_color: listing.sub_polygon_color || null,
                                };
                            }));

                            // Filter by bounding box client-side (less efficient but works)
                            const bboxFiltered = listingsWithCoords.filter((l: any) => {
                                return l.lng >= validation.data.minLng &&
                                    l.lng <= validation.data.maxLng &&
                                    l.lat >= validation.data.minLat &&
                                    l.lat <= validation.data.maxLat;
                            });

                            data = bboxFiltered;
                            console.log(`✅ Requête directe réussie: ${data.length} listings trouvés (${listingsWithCoords.length} avant filtrage bbox)`);
                        }
                    } catch (fallbackError: any) {
                        console.error('Erreur lors du fallback:', fallbackError);
                    }
                } else if (errorMessage.includes('column') || errorMessage.includes('sub_polygon') || errorMessage.includes('does not exist')) {
                    console.error('⚠️  Possible migration issue: sub_polygon column might not exist in search_listings function');
                    console.error('📋 Please apply migration: supabase/migrations/20240101000012_add_sub_polygon_to_search.sql');
                    console.error('   See: scripts/apply-sub-polygon-migration.sh for instructions');
                }
            } else {
                data = rpcResult.data;
                // Ensure required fields are included even from successful RPC call
                if (data && Array.isArray(data)) {
                    data = data.map((item: any) => ({
                        ...item,
                        title: item.title || null, // Ensure title is present
                        op_type: item.op_type || null, // Ensure op_type is present for coloring
                    }));
                }
            }

            if (error && !data) {
                // Return empty array instead of error to prevent UI breakage
                return NextResponse.json({
                    data: [],
                    pagination: {
                        limit: validation.data.limit,
                        offset: validation.data.offset,
                        count: 0,
                    },
                }, { status: 500 }) // Return 500 to indicate server error
            }

            // Log for debugging
            if (process.env.NODE_ENV === 'development') {
                console.log(`✅ Search returned ${data?.length || 0} listings`)
                if (data && data.length > 0) {
                    const withPolygon = data.filter((d: any) => d.sub_polygon && Array.isArray(d.sub_polygon) && d.sub_polygon.length >= 3);
                    console.log(`   ${withPolygon.length} listings with sub_polygon`)
                }
            }

            // Ensure data is an array and handle potential missing fields gracefully
            const safeData = Array.isArray(data) ? data.map((item: any) => ({
                ...item,
                title: item.title || null, // Ensure title is included even if null
                op_type: item.op_type || null, // Ensure op_type is included for coloring (rent/sell)
                sub_polygon: item.sub_polygon || null,
                sub_polygon_color: item.sub_polygon_color || null,
            })) : [];

            // Debug: Log sample data structure
            if (process.env.NODE_ENV === 'development' && safeData.length > 0) {
                console.log('Sample listing data:', {
                    id: safeData[0].id,
                    title: safeData[0].title,
                    price: safeData[0].price,
                    op_type: safeData[0].op_type, // Log op_type for debugging
                    has_sub_polygon: !!safeData[0].sub_polygon,
                });

                // Count by operation type
                const forSale = safeData.filter((d: any) => d.op_type === 'sell').length;
                const forRent = safeData.filter((d: any) => d.op_type === 'rent').length;
                console.log(`   ${forSale} à vendre (vert), ${forRent} à louer (bleu/indigo)`);
            }

            // Return paginated response with metadata
            return NextResponse.json({
                data: safeData,
                pagination: {
                    limit: validation.data.limit,
                    offset: validation.data.offset,
                    count: safeData.length,
                },
            })
        }
    )
}
