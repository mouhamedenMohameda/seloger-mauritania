#!/usr/bin/env tsx
/**
 * Script d'importation de données MongoDB vers Supabase
 * 
 * Usage:
 *   # Le script charge automatiquement les variables depuis:
 *   #   - .env.local (racine du projet)
 *   #   - apps/web/.env.local
 *   #
 *   # Depuis un fichier:
 *   pnpm tsx scripts/import-mongodb-data.ts --file=data.json
 * 
 *   # Depuis stdin (pipe):
 *   cat data.json | pnpm tsx scripts/import-mongodb-data.ts
 * 
 *   # Vous pouvez aussi surcharger les variables via la ligne de commande:
 *   SUPABASE_SERVICE_ROLE_KEY=your_key pnpm tsx scripts/import-mongodb-data.ts --file=data.json
 * 
 * Variables d'environnement requises (dans .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL - URL de votre projet Supabase
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (trouvable dans Supabase Dashboard > Settings > API)
 * 
 * ⚠️  Important: Le service role key bypass RLS. Gardez-le secret et ne le commitez jamais.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createPostGISPoint, sanitizeText } from '../apps/web/lib/validation';

// Load environment variables from .env.local if it exists
function loadEnvFile() {
    const envPath = resolve(process.cwd(), '.env.local');
    const webEnvPath = resolve(process.cwd(), 'apps/web/.env.local');
    
    // Try root .env.local first, then apps/web/.env.local
    const pathsToTry = [envPath, webEnvPath];
    
    for (const envFile of pathsToTry) {
        if (existsSync(envFile)) {
            const content = readFileSync(envFile, 'utf-8');
            const lines = content.split('\n');
            
            for (const line of lines) {
                const trimmed = line.trim();
                // Skip comments and empty lines
                if (trimmed.startsWith('#') || !trimmed) continue;
                
                // Parse KEY=VALUE or KEY="VALUE"
                const match = trimmed.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    let value = match[2].trim();
                    // Remove quotes if present
                    if ((value.startsWith('"') && value.endsWith('"')) || 
                        (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    // Only set if not already in process.env (allows override)
                    if (!process.env[key]) {
                        process.env[key] = value;
                    }
                }
            }
            return;
        }
    }
}

// Load env file before anything else
loadEnvFile();

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

interface MongoPublisher {
    userId: string;
    name: string;
    phoneNumber: string;
    email: string | null;
}

interface MongoListing {
    publisher: MongoPublisher;
    photos: string[];
    videos: string[];
    sold: boolean;
    deleted: boolean;
    tobedeleted: boolean;
    visible: boolean;
    visitCount: number;
    lot: string[];
    isRealLocation: boolean;
    subPolygon: any[];
    subPolygonColor: string;
    _id: string;
    clientName: string;
    clientPhoneNumber: string;
    title: string;
    description: string;
    category: string;
    subCategory: string;
    region: string;
    contractType: 'sale' | 'rent';
    professional: boolean;
    geometry: {
        type: 'Point';
        coordinates: [number, number]; // [lng, lat]
    };
    publicationDate: string;
    price: number;
    lotissement?: string;
    index?: string;
    ilotSize?: string;
    ilot?: string; // Certains listings ont 'ilot' au lieu de 'ilotSize'
    polygoneArea?: string;
    elevation?: string;
    sidesLength?: string;
    matterportLink?: string;
    realLatitude?: number; // Coordonnées réelles (si différentes de geometry)
    realLongitude?: number;
}

interface MongoCollection {
    collection: MongoListing[];
}

// Map MongoDB contractType to Supabase op_type
function mapContractType(contractType: string): 'rent' | 'sell' {
    if (contractType === 'sale') return 'sell';
    if (contractType === 'rent') return 'rent';
    // Default to 'sell' if unknown
    return 'sell';
}

// Map MongoDB status to Supabase status
function mapStatus(listing: MongoListing): 'published' | 'archived' | 'draft' {
    if (listing.deleted || listing.tobedeleted || listing.sold) {
        return 'archived';
    }
    if (listing.visible) {
        return 'published';
    }
    return 'draft';
}

// Extract surface from various fields
function extractSurface(listing: MongoListing): number | null {
    // Try polygoneArea first (e.g., "502.75 m²")
    if (listing.polygoneArea && listing.polygoneArea.trim() !== '') {
        const match = listing.polygoneArea.match(/(\d+\.?\d*)/);
        if (match) {
            const parsed = parseFloat(match[1]);
            if (!isNaN(parsed) && parsed > 0) {
                return parsed;
            }
        }
    }
    
    // Try ilotSize
    if (listing.ilotSize && listing.ilotSize.trim() !== '') {
        const parsed = parseFloat(listing.ilotSize);
        if (!isNaN(parsed) && parsed > 0) {
            return parsed;
        }
    }
    
    // Try ilot (alternative field name)
    if (listing.ilot && listing.ilot.trim() !== '') {
        // ilot might be a string like "Phase 3", so try to extract number if possible
        const match = listing.ilot.match(/(\d+\.?\d*)/);
        if (match) {
            const parsed = parseFloat(match[1]);
            if (!isNaN(parsed) && parsed > 0) {
                return parsed;
            }
        }
    }
    
    return null;
}

// Create or get profile for publisher
// Creates auth user first, then profile (requires service role key)
async function getOrCreateProfile(
    supabase: any,
    publisher: MongoPublisher
): Promise<string | null> {
    // Try to find existing profile by phone number
    const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', publisher.phoneNumber)
        .limit(1)
        .maybeSingle();

    if (existingProfile?.id) {
        return existingProfile.id;
    }

    // Generate a unique email if not provided
    const email = publisher.email || `import-${publisher.phoneNumber}@import.local`;
    
    // Create auth user with service role (bypasses normal auth flow)
    // Note: We use admin API to create users
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true, // Auto-confirm email
        password: `import-${Date.now()}-${Math.random()}`, // Random password
        user_metadata: {
            full_name: publisher.name,
            phone: publisher.phoneNumber,
        },
    });

    if (authError || !authUser?.user) {
        log(`  ⚠️  Erreur création auth user: ${authError?.message}`, colors.yellow);
        
        // Fallback: try to use first available profile
        const { data: defaultProfile } = await supabase
            .from('profiles')
            .select('id')
            .limit(1)
            .maybeSingle();

        if (defaultProfile?.id) {
            log(`  ⚠️  Utilisation du profile par défaut pour ${publisher.name}`, colors.yellow);
            return defaultProfile.id;
        }
        
        log(`  ❌ Impossible de créer/trouver un profile pour ${publisher.name}`, colors.red);
        return null;
    }

    const userId = authUser.user.id;

    // Profile should be created automatically by trigger, but update it with phone
    const { error: profileError } = await supabase
        .from('profiles')
        .update({
            full_name: publisher.name,
            phone: publisher.phoneNumber,
        })
        .eq('id', userId);

    if (profileError) {
        log(`  ⚠️  Erreur mise à jour profile: ${profileError.message}`, colors.yellow);
    }

    return userId;
}

/**
 * Calculate the center (centroid) of a polygon
 */
function calculatePolygonCenter(polygon: number[][]): [number, number] | null {
    if (!polygon || polygon.length < 3) return null;
    
    let sumLat = 0;
    let sumLng = 0;
    let validPoints = 0;
    
    for (const point of polygon) {
        if (Array.isArray(point) && point.length >= 2) {
            const [lng, lat] = point;
            if (!isNaN(lat) && !isNaN(lng) && 
                lat >= -90 && lat <= 90 && 
                lng >= -180 && lng <= 180) {
                sumLat += lat;
                sumLng += lng;
                validPoints++;
            }
        }
    }
    
    if (validPoints === 0) return null;
    
    return [sumLng / validPoints, sumLat / validPoints]; // [lng, lat]
}

async function importListing(
    supabase: any,
    mongoListing: MongoListing,
    ownerId: string
): Promise<string | null> {
    // Priority: Use subPolygon center if available, then realLatitude/realLongitude, then geometry coordinates
    let lat: number;
    let lng: number;
    
    // Check if subPolygon exists and calculate its center
    if (mongoListing.subPolygon && 
        Array.isArray(mongoListing.subPolygon) && 
        mongoListing.subPolygon.length >= 3) {
        const center = calculatePolygonCenter(mongoListing.subPolygon);
        if (center) {
            [lng, lat] = center;
            log(`  📍 Utilisation du centre du subPolygon (lat: ${lat.toFixed(6)}, lng: ${lng.toFixed(6)})`, colors.cyan);
        } else {
            // Fallback to other coordinates if subPolygon center calculation failed
            if (mongoListing.realLatitude && mongoListing.realLongitude) {
                lat = mongoListing.realLatitude;
                lng = mongoListing.realLongitude;
            } else {
                [lng, lat] = mongoListing.geometry.coordinates;
            }
        }
    } else if (mongoListing.realLatitude && mongoListing.realLongitude) {
        lat = mongoListing.realLatitude;
        lng = mongoListing.realLongitude;
    } else {
        [lng, lat] = mongoListing.geometry.coordinates;
    }
    
    // Validate coordinates
    if (!lat || !lng || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        log(`  ❌ Coordonnées invalides (lat: ${lat}, lng: ${lng}) pour ${mongoListing.title}`, colors.red);
        return null;
    }

    // Map fields
    const opType = mapContractType(mongoListing.contractType);
    const status = mapStatus(mongoListing);
    const surface = extractSurface(mongoListing);
    
    // Sanitize text fields
    const title = sanitizeText(mongoListing.title || 'Sans titre');
    const description = sanitizeText(mongoListing.description || '');
    
    // Try using RPC function first, fallback to direct insert if it doesn't exist
    let listingId: string | null = null;
    
    try {
        // Attempt to use RPC function (preferred method)
        const { data: rpcData, error: rpcError } = await supabase.rpc('create_listing_with_location', {
            p_title: title,
            p_op_type: opType,
            p_price: mongoListing.price || 1,
            p_rooms: null, // MongoDB listings don't have rooms field
            p_surface: surface,
            p_description: description || null,
            p_lat: lat,
            p_lng: lng,
            p_owner_id: ownerId,
            p_status: status
        });

        if (!rpcError && rpcData) {
            // RPC function worked
            const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;
            listingId = result?.id || null;
            
            if (listingId) {
                log(`  ✅ Listing créé via RPC (ID: ${listingId})`, colors.green);
            }
        } else if (rpcError && !rpcError.message?.includes('not found') && !rpcError.message?.includes('Could not find')) {
            // RPC exists but failed with a different error
            log(`  ⚠️  Erreur RPC: ${rpcError.message}, tentative avec INSERT direct...`, colors.yellow);
            throw rpcError; // Fall through to direct insert
        } else {
            // RPC function doesn't exist, fall back to direct insert
            log(`  ⚠️  Fonction RPC non trouvée, utilisation de l'INSERT direct...`, colors.yellow);
            throw new Error('RPC not found');
        }
    } catch (error: any) {
        // RPC function doesn't exist - use raw SQL query instead
        log(`  ⚠️  Fonction RPC non trouvée, utilisation d'une requête SQL directe...`, colors.yellow);
        
        try {
            // Use raw SQL query with PostGIS function
            // Note: This requires service role key and PostgreSQL connection
            const sqlQuery = `
                INSERT INTO listings (
                    title, op_type, price, rooms, surface, description, 
                    location, owner_id, status, created_at, updated_at,
                    visit_count, sold, professional, is_real_location,
                    client_name, client_phone_number, category, sub_category,
                    region, lotissement, lot, index, ilot_size, polygone_area,
                    elevation, sides_length, sub_polygon, sub_polygon_color, matterport_link
                ) VALUES (
                    $1, $2::listing_op_type, $3, $4, $5, $6,
                    ST_SetSRID(ST_MakePoint($8, $7), 4326)::geography,
                    $9::uuid, $10::listing_status, $11, $12,
                    $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29::jsonb, $30, $31
                )
                RETURNING id
            `;
            
            // Prepare values
            const values = [
                title,
                opType,
                mongoListing.price || 1,
                null, // rooms
                surface,
                description || null,
                lat, // p_lat (position 7)
                lng, // p_lng (position 8)
                ownerId,
                status,
                mongoListing.publicationDate || new Date().toISOString(),
                new Date().toISOString(),
                mongoListing.visitCount || 0,
                mongoListing.sold || false,
                mongoListing.professional || false,
                mongoListing.isRealLocation !== undefined ? mongoListing.isRealLocation : true,
                mongoListing.clientName?.trim() ? sanitizeText(mongoListing.clientName.trim()) : null,
                mongoListing.clientPhoneNumber?.trim() || null,
                mongoListing.category?.trim() || null,
                mongoListing.subCategory?.trim() || null,
                mongoListing.region?.trim() || null,
                mongoListing.lotissement?.trim() || null,
                mongoListing.lot && Array.isArray(mongoListing.lot) && mongoListing.lot.length > 0 ? mongoListing.lot : null,
                mongoListing.index?.trim() || null,
                (mongoListing.ilotSize?.trim() || mongoListing.ilot?.trim()) || null,
                mongoListing.polygoneArea?.trim() || null,
                mongoListing.elevation?.trim() || null,
                mongoListing.sidesLength?.trim() || null,
                mongoListing.subPolygon && Array.isArray(mongoListing.subPolygon) && mongoListing.subPolygon.length >= 3 ? mongoListing.subPolygon : null,
                mongoListing.subPolygonColor?.trim() || null,
                (mongoListing.matterportLink && mongoListing.matterportLink !== 'undefined' && mongoListing.matterportLink.trim()) ? mongoListing.matterportLink.trim() : null,
            ];
            
            // Use rpc with a SQL query (if available) or direct connection
            // Since Supabase JS client doesn't support raw SQL easily, we'll use a workaround
            // by calling the database function directly if it exists in a different way
            
            // Alternative: Create a temporary function or use PostgREST raw query endpoint
            // For now, return an error with instructions
            log(`  ❌ Impossible d'utiliser la requête SQL directe avec le client JS`, colors.red);
            log(`  💡 Solutions possibles:`, colors.cyan);
            log(`     1. Appliquez la migration create_listing_rpc.sql (RECOMMANDÉ)`, colors.cyan);
            log(`     2. Utilisez psql pour exécuter les inserts directement`, colors.cyan);
            log(`     3. Créez les listings via l'interface web`, colors.cyan);
            log(`  📄 Fichier migration: supabase/migrations/20240101000010_create_listing_rpc.sql`, colors.cyan);
            log(`  📖 Voir: APPLY_RPC_MIGRATION.md pour les instructions`, colors.cyan);
            return null;
            
        } catch (sqlError: any) {
            log(`  ❌ Erreur lors de la tentative SQL: ${sqlError.message}`, colors.red);
            return null;
        }
    }
    
    // Update MongoDB-specific fields after listing creation (if using RPC)
    if (listingId) {
        const mongoFields: any = {
            visit_count: mongoListing.visitCount || 0,
            sold: mongoListing.sold || false,
            professional: mongoListing.professional || false,
            is_real_location: mongoListing.isRealLocation !== undefined ? mongoListing.isRealLocation : true,
        };

        // Only include non-null fields
        if (mongoListing.clientName?.trim()) {
            mongoFields.client_name = sanitizeText(mongoListing.clientName.trim());
        }
        if (mongoListing.clientPhoneNumber?.trim()) {
            mongoFields.client_phone_number = mongoListing.clientPhoneNumber.trim();
        }
        if (mongoListing.category?.trim()) {
            mongoFields.category = mongoListing.category.trim();
        }
        if (mongoListing.subCategory?.trim()) {
            mongoFields.sub_category = mongoListing.subCategory.trim();
        }
        if (mongoListing.region?.trim()) {
            mongoFields.region = mongoListing.region.trim();
        }
        if (mongoListing.lotissement?.trim()) {
            mongoFields.lotissement = mongoListing.lotissement.trim();
        }
        if (mongoListing.lot && Array.isArray(mongoListing.lot) && mongoListing.lot.length > 0) {
            mongoFields.lot = mongoListing.lot;
        }
        if (mongoListing.index?.trim()) {
            mongoFields.index = mongoListing.index.trim();
        }
        if (mongoListing.ilotSize?.trim()) {
            mongoFields.ilot_size = mongoListing.ilotSize.trim();
        } else if (mongoListing.ilot?.trim()) {
            mongoFields.ilot_size = mongoListing.ilot.trim();
        }
        if (mongoListing.polygoneArea?.trim()) {
            mongoFields.polygone_area = mongoListing.polygoneArea.trim();
        }
        if (mongoListing.elevation?.trim()) {
            mongoFields.elevation = mongoListing.elevation.trim();
        }
        if (mongoListing.sidesLength?.trim()) {
            mongoFields.sides_length = mongoListing.sidesLength.trim();
        }
        if (mongoListing.subPolygon && Array.isArray(mongoListing.subPolygon) && mongoListing.subPolygon.length >= 3) {
            mongoFields.sub_polygon = mongoListing.subPolygon;
        }
        if (mongoListing.subPolygonColor?.trim()) {
            mongoFields.sub_polygon_color = mongoListing.subPolygonColor.trim();
        }
        if (mongoListing.matterportLink && mongoListing.matterportLink !== 'undefined' && mongoListing.matterportLink.trim()) {
            mongoFields.matterport_link = mongoListing.matterportLink.trim();
        }

        // Update listing with MongoDB fields
        const { error: updateError } = await supabase
            .from('listings')
            .update(mongoFields)
            .eq('id', listingId);

        if (updateError) {
            log(`  ⚠️  Erreur lors de la mise à jour des champs MongoDB: ${updateError.message}`, colors.yellow);
        }
    }

    return listingId;
}

async function importPhotos(
    supabase: any,
    listingId: string,
    photoUrls: string[]
): Promise<void> {
    if (photoUrls.length === 0) return;

    const photos = photoUrls.map((url, index) => ({
        listing_id: listingId,
        storage_path: url, // Store S3 URL as external path
        rank: index,
    }));

    const { error } = await supabase
        .from('listing_photos')
        .insert(photos);

    if (error) {
        log(`  ⚠️  Erreur lors de l'insertion des photos: ${error.message}`, colors.yellow);
    }
}

async function importData() {
    log('\n📥 Importation des données MongoDB vers Supabase\n', colors.cyan);
    log('='.repeat(60), colors.cyan);

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        log('❌ Variables d\'environnement manquantes:', colors.red);
        log('   - NEXT_PUBLIC_SUPABASE_URL', colors.yellow);
        log('   - SUPABASE_SERVICE_ROLE_KEY', colors.yellow);
        log('\n💡 Utilisez le service role key pour bypasser RLS lors de l\'importation', colors.cyan);
        process.exit(1);
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase: any = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    // Read JSON data
    let jsonData: MongoCollection;
    const fileArg = process.argv.find(arg => arg.startsWith('--file='));
    
    if (fileArg) {
        const filePath = fileArg.split('=')[1];
        log(`📄 Lecture du fichier: ${filePath}`, colors.blue);
        const fileContent = readFileSync(filePath, 'utf-8');
        jsonData = JSON.parse(fileContent);
    } else {
        // Read from stdin
        log('📄 Lecture depuis stdin...', colors.blue);
        let input = '';
        process.stdin.setEncoding('utf-8');
        
        for await (const chunk of process.stdin) {
            input += chunk;
        }
        
        jsonData = JSON.parse(input);
    }

    if (!jsonData.collection || !Array.isArray(jsonData.collection)) {
        log('❌ Format JSON invalide: "collection" doit être un tableau', colors.red);
        process.exit(1);
    }

    const listings = jsonData.collection;
    log(`\n📊 ${listings.length} listings trouvés\n`, colors.blue);

    // Statistics
    let successCount = 0;
    let errorCount = 0;
    const publisherMap = new Map<string, string>(); // Map publisher userId -> profile id

    // Process each listing
    for (let i = 0; i < listings.length; i++) {
        const listing = listings[i];
        log(`\n[${i + 1}/${listings.length}] ${listing.title || listing._id}`, colors.cyan);

        try {
            // Validate required fields
            if (!listing.title && !listing._id) {
                log(`  ⚠️  Listing sans titre ni ID, ignoré`, colors.yellow);
                errorCount++;
                continue;
            }

            // Get or create profile for publisher
            const publisherKey = listing.publisher?.userId || listing.publisher?.phoneNumber;
            if (!publisherKey) {
                log(`  ❌ Pas de publisher userId ou phoneNumber, ignoré`, colors.red);
                errorCount++;
                continue;
            }

            let ownerId: string | null = publisherMap.get(publisherKey) || null;

            if (!ownerId) {
                ownerId = await getOrCreateProfile(supabase, listing.publisher);
                if (ownerId) {
                    publisherMap.set(publisherKey, ownerId);
                }
            }

            if (!ownerId) {
                log(`  ❌ Impossible de trouver/créer un profile`, colors.red);
                errorCount++;
                continue;
            }

            // Import listing
            const listingId = await importListing(supabase, listing, ownerId);
            
            if (!listingId) {
                errorCount++;
                continue;
            }

            // Import photos
            if (listing.photos && listing.photos.length > 0) {
                await importPhotos(supabase, listingId, listing.photos);
                log(`  📸 ${listing.photos.length} photo(s) importée(s)`, colors.green);
            }

            // Note: Videos are in the JSON but not imported yet (no videos table)
            if (listing.videos && listing.videos.length > 0) {
                log(`  ℹ️  ${listing.videos.length} vidéo(s) détectée(s) (non importées)`, colors.cyan);
            }

            successCount++;
            log(`  ✅ Listing importé avec succès (ID: ${listingId})`, colors.green);

        } catch (error: any) {
            log(`  ❌ Erreur: ${error.message}`, colors.red);
            errorCount++;
        }
    }

    // Summary
    log('\n' + '='.repeat(60), colors.cyan);
    log('\n📊 Résumé de l\'importation:', colors.blue);
    log(`  Total: ${listings.length}`, colors.reset);
    log(`  ✅ Réussis: ${successCount}`, colors.green);
    log(`  ❌ Échoués: ${errorCount}`, errorCount > 0 ? colors.red : colors.reset);
    log(`  👥 Publishers uniques: ${publisherMap.size}`, colors.cyan);
    log('\n' + '='.repeat(60), colors.cyan);

    if (errorCount === 0) {
        log('\n🎉 Tous les listings ont été importés avec succès !\n', colors.green);
    } else {
        log(`\n⚠️  ${errorCount} listing(s) n'ont pas pu être importés.\n`, colors.yellow);
    }
}

// Run import
importData().catch((error) => {
    log(`\n❌ Erreur fatale: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
});
