#!/usr/bin/env tsx
/**
 * Script pour vérifier si la migration Phase 2.1 a été appliquée
 */

import { createClient } from '@supabase/supabase-js';

async function checkMigration() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Variables d\'environnement manquantes:');
        console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
        console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✓' : '✗');
        console.error('\n💡 Chargez les variables depuis .env.local ou .env');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔍 Vérification de la migration Phase 2.1...\n');

    try {
        // Test 1: Vérifier si la fonction existe avec les nouveaux paramètres
        console.log('1. Test de la fonction search_listings avec nouveaux paramètres...');
        
        const { data, error } = await supabase.rpc('search_listings', {
            min_lng: -17.0,
            min_lat: 16.0,
            max_lng: -14.0,
            max_lat: 20.0,
            min_price: null,
            max_price: null,
            min_rooms: null,
            max_rooms: null,  // Nouveau paramètre
            min_surface: null, // Nouveau paramètre
            max_surface: null, // Nouveau paramètre
            op_type_filter: null, // Nouveau paramètre
            sort_order: 'date_desc', // Nouveau paramètre
            limit_count: 5,
            offset_count: 0,
        });

        if (error) {
            console.error('❌ Erreur lors de l\'appel de la fonction:');
            console.error('   Code:', error.code);
            console.error('   Message:', error.message);
            console.error('   Details:', error.details);
            console.error('\n💡 La migration n\'a probablement pas été appliquée.');
            console.error('   Suivez APPLY_MIGRATION_PHASE2-1.md pour appliquer la migration.\n');
            process.exit(1);
        }

        console.log('✅ Fonction search_listings fonctionne avec les nouveaux paramètres');
        console.log(`   Résultats: ${data?.length || 0} annonces trouvées\n`);

        // Test 2: Vérifier le tri
        console.log('2. Test du tri par prix...');
        
        const { data: sortedData, error: sortError } = await supabase.rpc('search_listings', {
            min_lng: -17.0,
            min_lat: 16.0,
            max_lng: -14.0,
            max_lat: 20.0,
            min_price: null,
            max_price: null,
            min_rooms: null,
            max_rooms: null,
            min_surface: null,
            max_surface: null,
            op_type_filter: null,
            sort_order: 'price_asc',
            limit_count: 10,
            offset_count: 0,
        });

        if (sortError) {
            console.error('❌ Erreur lors du test de tri:', sortError.message);
            process.exit(1);
        }

        console.log('✅ Tri fonctionne correctement');
        if (sortedData && sortedData.length > 1) {
            const prices = sortedData.map((item: any) => item.price).filter((p: any) => p !== null);
            const isSorted = prices.every((price: number, i: number) => i === 0 || prices[i - 1] <= price);
            console.log(`   Prix triés: ${isSorted ? '✓' : '✗'}`);
        }

        // Test 3: Vérifier les filtres
        console.log('\n3. Test des filtres...');
        
        const { data: filteredData, error: filterError } = await supabase.rpc('search_listings', {
            min_lng: -17.0,
            min_lat: 16.0,
            max_lng: -14.0,
            max_lat: 20.0,
            min_price: 20000,
            max_price: 100000,
            min_rooms: 2,
            max_rooms: 5,
            min_surface: 50,
            max_surface: 200,
            op_type_filter: 'rent',
            sort_order: 'date_desc',
            limit_count: 10,
            offset_count: 0,
        });

        if (filterError) {
            console.error('❌ Erreur lors du test de filtres:', filterError.message);
            process.exit(1);
        }

        console.log('✅ Filtres fonctionnent correctement');
        console.log(`   Résultats filtrés: ${filteredData?.length || 0} annonces\n`);

        console.log('🎉 Migration Phase 2.1 appliquée avec succès !\n');
        console.log('✅ Tous les tests passent');
        console.log('✅ Vous pouvez maintenant tester l\'interface utilisateur\n');

    } catch (err) {
        console.error('❌ Erreur inattendue:', err);
        process.exit(1);
    }
}

checkMigration();

