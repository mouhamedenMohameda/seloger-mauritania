#!/usr/bin/env tsx
/**
 * Script de diagnostic pour vérifier l'état de la base de données
 * Vérifie si les migrations sont appliquées, si les données existent, etc.
 */

import { createClient } from '@supabase/supabase-js';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

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
                if (trimmed && !trimmed.startsWith('#')) {
                    const match = trimmed.match(/^([^=]+)=(.*)$/);
                    if (match) {
                        const key = match[1].trim();
                        const value = match[2].trim().replace(/^["']|["']$/g, '');
                        if (!process.env[key]) {
                            process.env[key] = value;
                        }
                    }
                }
            }
            console.log(`✅ Variables chargées depuis: ${envFile}`);
            break;
        }
    }
}

loadEnvFile();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erreur: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY) doivent être définis');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseStatus() {
    console.log('\n🔍 Vérification de l\'état de la base de données...\n');
    
    // 1. Vérifier si la table listings existe et a des données
    console.log('1️⃣  Vérification de la table listings...');
    const { data: listings, error: listingsError, count } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: false })
        .limit(5);
    
    if (listingsError) {
        console.error(`   ❌ Erreur lors de la lecture des listings: ${listingsError.message}`);
    } else {
        console.log(`   ✅ ${count || 0} listing(s) trouvé(s) dans la base de données`);
        
        if (listings && listings.length > 0) {
            const published = listings.filter(l => l.status === 'published').length;
            const withLocation = listings.filter(l => l.location !== null).length;
            const withSubPolygon = listings.filter(l => l.sub_polygon !== null).length;
            
            console.log(`      • ${published} avec status='published'`);
            console.log(`      • ${withLocation} avec location (coordonnées)`);
            console.log(`      • ${withSubPolygon} avec sub_polygon`);
            
            if (published === 0) {
                console.log('   ⚠️  ATTENTION: Aucun listing publié trouvé! Les listings doivent avoir status=\'published\' pour apparaître sur la carte.');
            }
            
            if (withLocation === 0) {
                console.log('   ⚠️  ATTENTION: Aucun listing avec coordonnées! Ils ne peuvent pas être affichés sur la carte.');
            }
            
            // Afficher un exemple
            const example = listings[0];
            console.log('\n   📋 Exemple de listing:');
            console.log(`      • ID: ${example.id}`);
            console.log(`      • Title: ${example.title || 'N/A'}`);
            console.log(`      • Status: ${example.status || 'N/A'}`);
            console.log(`      • Price: ${example.price || 'N/A'}`);
            console.log(`      • Location: ${example.location ? '✅' : '❌'}`);
            console.log(`      • Sub_polygon: ${example.sub_polygon ? '✅ (' + (Array.isArray(example.sub_polygon) ? example.sub_polygon.length : 'N/A') + ' points)' : '❌'}`);
        }
    }
    
    // 2. Vérifier si la fonction search_listings existe et retourne sub_polygon
    console.log('\n2️⃣  Vérification de la fonction search_listings...');
    try {
        const { data: searchResult, error: searchError } = await supabase.rpc('search_listings', {
            min_lng: -16.0,
            min_lat: 18.0,
            max_lng: -15.9,
            max_lat: 18.15,
            limit_count: 1,
            offset_count: 0,
        });
        
        if (searchError) {
            console.error(`   ❌ Erreur lors de l'appel à search_listings: ${searchError.message}`);
            console.error(`   Détails: ${JSON.stringify(searchError, null, 2)}`);
            
            if (searchError.message?.includes('column') || searchError.message?.includes('sub_polygon') || searchError.message?.includes('does not exist')) {
                console.error('\n   ⚠️  PROBLÈME DÉTECTÉ: La fonction search_listings ne retourne pas sub_polygon!');
                console.error('   📋 Solution: Appliquez la migration:');
                console.error('      supabase/migrations/20240101000012_add_sub_polygon_to_search.sql');
                console.error('   💡 Utilisez: ./scripts/apply-sub-polygon-migration.sh');
            }
        } else {
            console.log(`   ✅ Fonction search_listings fonctionne`);
            
            if (searchResult && searchResult.length > 0) {
                const first = searchResult[0];
                const hasSubPolygon = 'sub_polygon' in first;
                const hasSubPolygonColor = 'sub_polygon_color' in first;
                
                console.log(`      • Retourne sub_polygon: ${hasSubPolygon ? '✅' : '❌'}`);
                console.log(`      • Retourne sub_polygon_color: ${hasSubPolygonColor ? '✅' : '❌'}`);
                
                if (!hasSubPolygon || !hasSubPolygonColor) {
                    console.error('\n   ⚠️  PROBLÈME: La fonction ne retourne pas sub_polygon/sub_polygon_color!');
                    console.error('   📋 Solution: Appliquez la migration:');
                    console.error('      supabase/migrations/20240101000012_add_sub_polygon_to_search.sql');
                }
                
                if (first.sub_polygon) {
                    console.log(`      • Exemple sub_polygon: ${Array.isArray(first.sub_polygon) ? first.sub_polygon.length + ' points' : 'invalid format'}`);
                }
            } else {
                console.log('   ⚠️  Aucun résultat retourné (peut être normal si aucun listing dans la zone de recherche)');
            }
        }
    } catch (error: any) {
        console.error(`   ❌ Erreur lors du test de search_listings: ${error.message}`);
    }
    
    // 3. Vérifier si les colonnes existent dans la table
    console.log('\n3️⃣  Vérification des colonnes dans la table listings...');
    try {
        const { data: columns, error: columnsError } = await supabase
            .from('listings')
            .select('sub_polygon, sub_polygon_color, location')
            .limit(1);
        
        if (columnsError) {
            if (columnsError.message?.includes('column') || columnsError.message?.includes('does not exist')) {
                console.error(`   ❌ Erreur: Colonnes manquantes dans la table listings`);
                console.error(`   Message: ${columnsError.message}`);
                console.error('\n   ⚠️  PROBLÈME DÉTECTÉ: Les colonnes sub_polygon ou sub_polygon_color n\'existent pas!');
                console.error('   📋 Solution: Appliquez la migration:');
                console.error('      supabase/migrations/20240101000011_mongodb_fields.sql');
            } else {
                console.error(`   ❌ Erreur: ${columnsError.message}`);
            }
        } else {
            console.log('   ✅ Colonnes sub_polygon, sub_polygon_color, location existent');
        }
    } catch (error: any) {
        console.error(`   ❌ Erreur lors de la vérification des colonnes: ${error.message}`);
    }
    
    // 4. Résumé
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RÉSUMÉ:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Si rien ne s\'affiche sur le site, vérifiez:');
    console.log('  1. ✅ Les migrations sont appliquées (voir scripts/apply-*-migration.sh)');
    console.log('  2. ✅ Les listings ont status=\'published\'');
    console.log('  3. ✅ Les listings ont des coordonnées (location)');
    console.log('  4. ✅ La fonction search_listings retourne sub_polygon');
    console.log('  5. ✅ Les données ont été importées (voir scripts/import-mongodb-data.ts)');
    console.log('');
}

checkDatabaseStatus().catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
});
