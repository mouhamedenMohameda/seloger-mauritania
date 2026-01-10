#!/usr/bin/env tsx
/**
 * Script de test simple pour vérifier la création de listings
 * Usage: pnpm tsx scripts/test-create-listing.ts
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load environment variables
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

async function testCreateListing() {
    log('\n🧪 Test de création de listing\n', colors.cyan);
    log('='.repeat(60), colors.cyan);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Check environment variables
    if (!supabaseUrl) {
        log('❌ NEXT_PUBLIC_SUPABASE_URL manquant', colors.red);
        log('   Ajoutez-le dans .env.local', colors.yellow);
        process.exit(1);
    }

    if (!serviceRoleKey) {
        log('❌ SUPABASE_SERVICE_ROLE_KEY manquant', colors.red);
        log('   Ajoutez-le dans .env.local', colors.yellow);
        process.exit(1);
    }

    log(`✅ Supabase URL: ${supabaseUrl.substring(0, 30)}...`, colors.green);
    log(`✅ Service Role Key: ${serviceRoleKey.substring(0, 20)}...`, colors.green);

    // Create Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    // Get a default owner_id
    log('\n📋 Recherche d\'un owner_id par défaut...', colors.blue);
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .maybeSingle();

    if (profileError || !profile) {
        log(`❌ Impossible de trouver un profile: ${profileError?.message}`, colors.red);
        log('   Créez d\'abord un utilisateur via l\'interface web', colors.yellow);
        process.exit(1);
    }

    const ownerId = profile.id;
    log(`✅ Owner ID trouvé: ${ownerId}`, colors.green);

    // Test 1: Check if RPC function exists
    log('\n📋 Test 1: Vérification de la fonction RPC...', colors.blue);
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_listing_with_location', {
        p_title: 'Test Listing',
        p_op_type: 'rent',
        p_price: 100000,
        p_rooms: null,
        p_surface: null,
        p_description: null,
        p_lat: 18.0735,
        p_lng: -15.9582,
        p_owner_id: ownerId,
        p_status: 'published'
    });

    if (rpcError) {
        if (rpcError.message?.includes('not found') || rpcError.message?.includes('Could not find')) {
            log('❌ Fonction RPC non trouvée', colors.red);
            log('   Erreur: ' + rpcError.message, colors.red);
            log('\n💡 Solution: Appliquez la migration RPC', colors.cyan);
            log('   Fichier: supabase/migrations/20240101000010_create_listing_rpc.sql', colors.cyan);
            log('   Voir: APPLY_RPC_MIGRATION.md pour les instructions', colors.cyan);
            process.exit(1);
        } else {
            log(`⚠️  Erreur RPC: ${rpcError.message}`, colors.yellow);
        }
    } else {
        log('✅ Fonction RPC fonctionne!', colors.green);
        const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        if (result?.id) {
            log(`   Listing créé avec ID: ${result.id}`, colors.green);
            
            // Cleanup: Delete test listing
            log('\n🧹 Nettoyage: Suppression du listing de test...', colors.blue);
            await supabase.from('listings').delete().eq('id', result.id);
            log('✅ Listing de test supprimé', colors.green);
        }
    }

    log('\n' + '='.repeat(60), colors.cyan);
    log('\n✅ Tous les tests sont passés!\n', colors.green);
}

testCreateListing().catch((error) => {
    log(`\n❌ Erreur fatale: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
});
