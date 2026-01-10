#!/usr/bin/env tsx
/**
 * Script simple pour importer des listings depuis un fichier JSON
 * 
 * Ce script supporte deux formats JSON:
 * 1. Format MongoDB (comme mes-annonces.json, data.json)
 * 2. Format simple API (format attendu par l'API POST /api/listings)
 * 
 * Usage:
 *   # Depuis un fichier MongoDB format:
 *   pnpm tsx scripts/import-listings-json.ts --file=mes-annonces.json
 * 
 *   # Depuis un fichier simple format:
 *   pnpm tsx scripts/import-listings-json.ts --file=listings.json --format=simple
 * 
 *   # Depuis stdin:
 *   cat listings.json | pnpm tsx scripts/import-listings-json.ts --format=simple
 * 
 * Variables d'environnement requises (dans .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL - URL de votre projet Supabase
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (trouvable dans Supabase Dashboard > Settings > API)
 * 
 * ⚠️  Important: Le service role key bypass RLS. Gardez-le secret et ne le commitez jamais.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env.local if it exists
function loadEnvFile() {
    const envPath = resolve(process.cwd(), '.env.local');
    const webEnvPath = resolve(process.cwd(), 'apps/web/.env.local');
    
    const pathsToTry = [envPath, webEnvPath];
    
    for (const envFile of pathsToTry) {
        if (existsSync(envFile)) {
            const content = readFileSync(envFile, 'utf-8');
            const lines = content.split('\n');
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('#') || !trimmed) continue;
                
                const match = trimmed.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    let value = match[2].trim();
                    if ((value.startsWith('"') && value.endsWith('"')) || 
                        (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    if (!process.env[key]) {
                        process.env[key] = value;
                    }
                }
            }
            return;
        }
    }
}

loadEnvFile();

// Simple format (API format)
interface SimpleListing {
    title: string;
    price: number;
    op_type: 'rent' | 'sell';
    lat: number;
    lng: number;
    rooms?: number;
    surface?: number;
    description?: string;
    owner_id?: string; // Optional - will use service role or default user
}

interface SimpleListingCollection {
    listings: SimpleListing[];
}

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

async function importSimpleListing(
    supabase: any,
    listing: SimpleListing,
    ownerId: string
): Promise<string | null> {
    try {
        // Use RPC function (preferred method)
        const { data: rpcData, error: rpcError } = await supabase.rpc('create_listing_with_location', {
            p_title: listing.title,
            p_op_type: listing.op_type,
            p_price: listing.price,
            p_rooms: listing.rooms ?? null,
            p_surface: listing.surface ?? null,
            p_description: listing.description ?? null,
            p_lat: listing.lat,
            p_lng: listing.lng,
            p_owner_id: ownerId,
            p_status: 'published'
        });

        if (rpcError) {
            // If RPC not found, try using bulk API endpoint
            if (rpcError.message?.includes('not found') || rpcError.message?.includes('Could not find')) {
                log(`  ⚠️  Fonction RPC non trouvée, utilisation de l'API bulk...`, colors.yellow);
                
                // Use bulk API endpoint as fallback
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
                
                if (!supabaseUrl) {
                    log(`  ❌ NEXT_PUBLIC_SUPABASE_URL manquant`, colors.red);
                    return null;
                }
                
                // Try using the bulk API endpoint
                const apiUrl = supabaseUrl.replace(/\.supabase\.co/, '') + '/api/listings/bulk';
                const bulkResponse = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': serviceRoleKey ? `Bearer ${serviceRoleKey}` : '',
                    },
                    body: JSON.stringify({ listings: [{ ...listing, owner_id: ownerId }] }),
                });
                
                if (!bulkResponse.ok) {
                    const errorData = await bulkResponse.json().catch(() => ({}));
                    log(`  ❌ Erreur API bulk: ${errorData.error || bulkResponse.statusText}`, colors.red);
                    return null;
                }
                
                const bulkData = await bulkResponse.json();
                if (bulkData.results && bulkData.results.length > 0 && bulkData.results[0].success) {
                    return bulkData.results[0].id || null;
                }
                
                log(`  ❌ Erreur lors de l'import via API bulk`, colors.red);
                return null;
            }
            
            log(`  ❌ Erreur RPC: ${rpcError.message}`, colors.red);
            return null;
        }

        const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        return result?.id || null;
    } catch (error: any) {
        log(`  ❌ Erreur: ${error.message}`, colors.red);
        return null;
    }
}

async function getDefaultOwnerId(supabase: any): Promise<string | null> {
    // Get first available profile
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .maybeSingle();

    if (error || !profile) {
        log(`  ⚠️  Impossible de trouver un owner_id par défaut`, colors.yellow);
        return null;
    }

    return profile.id;
}

async function importSimpleListings() {
    log('\n📥 Importation de listings depuis un fichier JSON simple\n', colors.cyan);
    log('='.repeat(60), colors.cyan);

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        log('❌ Variables d\'environnement manquantes:', colors.red);
        log('   - NEXT_PUBLIC_SUPABASE_URL', colors.yellow);
        log('   - SUPABASE_SERVICE_ROLE_KEY', colors.yellow);
        process.exit(1);
    }

    // Create Supabase client with service role (bypasses RLS)
    const { createClient } = await import('@supabase/supabase-js');
    const supabase: any = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    // Read JSON data
    let jsonData: SimpleListingCollection;
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

    // Support both formats
    let listings: SimpleListing[];
    if (jsonData.listings && Array.isArray(jsonData.listings)) {
        listings = jsonData.listings;
    } else if (Array.isArray(jsonData)) {
        listings = jsonData as any;
    } else {
        log('❌ Format JSON invalide: doit contenir un tableau "listings" ou être un tableau', colors.red);
        process.exit(1);
    }

    log(`\n📊 ${listings.length} listings trouvés\n`, colors.blue);

    // Get default owner_id
    const defaultOwnerId = await getDefaultOwnerId(supabase);
    if (!defaultOwnerId) {
        log('❌ Impossible de continuer sans owner_id', colors.red);
        process.exit(1);
    }

    // Statistics
    let successCount = 0;
    let errorCount = 0;

    // Process each listing
    for (let i = 0; i < listings.length; i++) {
        const listing = listings[i];
        log(`\n[${i + 1}/${listings.length}] ${listing.title || 'Sans titre'}`, colors.cyan);

        try {
            // Validate required fields
            if (!listing.title || !listing.price || !listing.lat || !listing.lng) {
                log(`  ⚠️  Champs requis manquants (title, price, lat, lng), ignoré`, colors.yellow);
                errorCount++;
                continue;
            }

            const ownerId = listing.owner_id || defaultOwnerId;
            const listingId = await importSimpleListing(supabase, listing, ownerId);
            
            if (!listingId) {
                errorCount++;
                continue;
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
    log('\n' + '='.repeat(60), colors.cyan);

    if (errorCount === 0) {
        log('\n🎉 Tous les listings ont été importés avec succès !\n', colors.green);
    } else {
        log(`\n⚠️  ${errorCount} listing(s) n'ont pas pu être importés.\n`, colors.yellow);
    }
}

// Check if we should use MongoDB format (via import-mongodb-data.ts) or simple format
const formatArg = process.argv.find(arg => arg.startsWith('--format='));
const format = formatArg ? formatArg.split('=')[1] : 'simple';

if (format === 'mongo' || format === 'mongodb') {
    // Use the existing MongoDB import script
    log('🔄 Utilisation du script MongoDB import...', colors.cyan);
    log('💡 Exécutez: pnpm tsx scripts/import-mongodb-data.ts --file=votre-fichier.json', colors.yellow);
    process.exit(0);
} else {
    // Use simple format
    importSimpleListings().catch((error) => {
        log(`\n❌ Erreur fatale: ${error.message}`, colors.red);
        console.error(error);
        process.exit(1);
    });
}
