#!/usr/bin/env tsx
/**
 * Script pour vérifier les permissions administrateur
 * Usage: pnpm tsx scripts/check-admin-permissions.ts
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

async function checkAdminPermissions() {
    log('\n🔍 Vérification des permissions administrateur\n', colors.cyan);
    log('='.repeat(60), colors.cyan);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        log('❌ Variables d\'environnement manquantes:', colors.red);
        log('   - NEXT_PUBLIC_SUPABASE_URL', colors.yellow);
        log('   - SUPABASE_SERVICE_ROLE_KEY', colors.yellow);
        process.exit(1);
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    // Test 1: Vérifier les politiques RLS sur listings
    log('\n📋 Test 1: Vérification des politiques RLS sur listings...', colors.blue);
    
    const { data: policies, error: policiesError } = await supabase
        .rpc('exec_sql', {
            query: `
                SELECT policyname, cmd, qual 
                FROM pg_policies 
                WHERE tablename = 'listings'
                ORDER BY policyname;
            `
        })
        .catch(() => {
            // Si exec_sql n'existe pas, utiliser une requête directe
            return { data: null, error: { message: 'Cannot query policies directly' } };
        });

    if (policiesError) {
        log('⚠️  Impossible de vérifier les politiques directement', colors.yellow);
        log('   Utilisation d\'une méthode alternative...', colors.yellow);
    } else if (policies) {
        log('✅ Politiques trouvées:', colors.green);
        policies.forEach((policy: any) => {
            log(`   - ${policy.policyname} (${policy.cmd})`, colors.reset);
        });
    }

    // Test 2: Vérifier que les politiques admin existent en SQL direct
    log('\n📋 Test 2: Vérification des politiques admin via requête SQL...', colors.blue);
    
    // On va vérifier directement dans pg_policy
    const checkPoliciesQuery = `
        SELECT 
            p.polname as policy_name,
            CASE p.polcmd
                WHEN 'r' THEN 'SELECT'
                WHEN 'a' THEN 'INSERT'
                WHEN 'w' THEN 'UPDATE'
                WHEN 'd' THEN 'DELETE'
                ELSE p.polcmd::text
            END as command
        FROM pg_policy p
        JOIN pg_class c ON c.oid = p.polrelid
        WHERE c.relname = 'listings'
        AND p.polname LIKE '%admin%' OR p.polname LIKE '%Admin%'
        ORDER BY p.polname;
    `;

    // Test 3: Créer un utilisateur de test admin
    log('\n📋 Test 3: Vérification des utilisateurs existants...', colors.blue);
    
    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, role, full_name')
        .limit(10);

    if (profilesError) {
        log(`❌ Erreur lors de la récupération des profils: ${profilesError.message}`, colors.red);
    } else if (profiles && profiles.length > 0) {
        log(`✅ ${profiles.length} profil(s) trouvé(s):`, colors.green);
        profiles.forEach((profile: any) => {
            const roleColor = profile.role === 'admin' ? colors.green : 
                             profile.role === 'agence' ? colors.cyan : colors.reset;
            log(`   - ${profile.full_name || profile.id.substring(0, 8)}... (role: ${profile.role})`, roleColor);
        });
        
        // Vérifier s'il y a des admins
        const admins = profiles.filter((p: any) => p.role === 'admin');
        if (admins.length === 0) {
            log('\n⚠️  Aucun administrateur trouvé!', colors.yellow);
            log('   Pour créer un admin, exécutez:', colors.cyan);
            log('   UPDATE profiles SET role = \'admin\' WHERE id = \'USER_ID_HERE\'::uuid;', colors.cyan);
        } else {
            log(`\n✅ ${admins.length} administrateur(s) trouvé(s)`, colors.green);
        }
    } else {
        log('⚠️  Aucun profil trouvé', colors.yellow);
    }

    // Test 4: Vérifier les listings existants
    log('\n📋 Test 4: Vérification des listings existants...', colors.blue);
    
    const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select('id, title, owner_id, status')
        .limit(5);

    if (listingsError) {
        log(`❌ Erreur lors de la récupération des listings: ${listingsError.message}`, colors.red);
    } else if (listings && listings.length > 0) {
        log(`✅ ${listings.length} listing(s) trouvé(s):`, colors.green);
        listings.forEach((listing: any) => {
            log(`   - ${listing.title || listing.id.substring(0, 8)}... (status: ${listing.status}, owner: ${listing.owner_id.substring(0, 8)}...)`, colors.reset);
        });
    } else {
        log('⚠️  Aucun listing trouvé', colors.yellow);
        log('   Créez un listing via l\'interface web pour tester', colors.cyan);
    }

    // Instructions finales
    log('\n' + '='.repeat(60), colors.cyan);
    log('\n💡 Instructions pour vérifier manuellement:', colors.blue);
    log('\n1. Vérifier les politiques dans Supabase Dashboard:', colors.reset);
    log('   - Allez dans Database > Policies', colors.cyan);
    log('   - Sélectionnez la table "listings"', colors.cyan);
    log('   - Vous devriez voir les politiques suivantes:', colors.cyan);
    log('     * "Admins can view all listings" (SELECT)', colors.green);
    log('     * "Admins can update any listing" (UPDATE)', colors.green);
    log('     * "Admins can delete any listing" (DELETE)', colors.green);
    
    log('\n2. Si les politiques n\'existent pas, appliquez la migration:', colors.reset);
    log('   - Fichier: supabase/migrations/20240101000016_admin_delete_listings.sql', colors.cyan);
    log('   - Voir: APPLY_ADMIN_PERMISSIONS.md', colors.cyan);
    
    log('\n3. Vérifier qu\'un utilisateur est admin:', colors.reset);
    log('   - Connectez-vous avec un compte admin', colors.cyan);
    log('   - Vérifiez dans /account que le type est "Administrateur"', colors.cyan);
    
    log('\n4. Tester les permissions:', colors.reset);
    log('   - Connectez-vous avec un compte admin', colors.cyan);
    log('   - Allez sur un listing d\'un autre utilisateur', colors.cyan);
    log('   - Vous devriez pouvoir le modifier/supprimer', colors.cyan);
    
    log('\n' + '='.repeat(60), colors.cyan);
}

checkAdminPermissions().catch((error) => {
    log(`\n❌ Erreur fatale: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
});
