#!/usr/bin/env tsx
/**
 * Phase 3.1 Test Script - Favorites & Alerts
 * 
 * Tests:
 * 1. Migration SQL exists and is valid
 * 2. API routes exist (favorites, alerts)
 * 3. React Query hooks exist
 * 4. UI components exist (FavoriteButton)
 * 5. Pages exist (favorites, alerts)
 * 6. Translations exist
 */

// Test results tracking
interface TestResult {
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    message?: string;
    duration?: number;
}

const results: TestResult[] = [];

function test(name: string, fn: () => Promise<void> | void): void {
    const start = Date.now();
    try {
        const result = fn();
        if (result instanceof Promise) {
            result
                .then(() => {
                    const duration = Date.now() - start;
                    results.push({ name, status: 'passed', duration });
                    console.log(`✅ ${name} (${duration}ms)`);
                })
                .catch((error) => {
                    const duration = Date.now() - start;
                    results.push({ name, status: 'failed', message: error.message, duration });
                    console.error(`❌ ${name}: ${error.message}`);
                });
        } else {
            const duration = Date.now() - start;
            results.push({ name, status: 'passed', duration });
            console.log(`✅ ${name} (${duration}ms)`);
        }
    } catch (error) {
        const duration = Date.now() - start;
        const err = error instanceof Error ? error : new Error(String(error));
        results.push({ name, status: 'failed', message: err.message, duration });
        console.error(`❌ ${name}: ${err.message}`);
    }
}

// ============================================================================
// 1. MIGRATION TESTS
// ============================================================================

async function testMigration() {
    console.log('\n🗄️  Testing Migration...\n');

    test('Migration: favorites_alerts.sql exists', () => {
        const fs = require('fs');
        const path = require('path');
        const migrationPath = path.join(__dirname, '../supabase/migrations/20240101000008_favorites_alerts.sql');
        
        if (!fs.existsSync(migrationPath)) {
            throw new Error('Migration file not found');
        }

        const content = fs.readFileSync(migrationPath, 'utf-8');
        
        if (!content.includes('create table') || !content.includes('favorites')) {
            throw new Error('Favorites table not found in migration');
        }

        if (!content.includes('search_alerts')) {
            throw new Error('Search alerts table not found in migration');
        }

        if (!content.includes('row level security') || !content.includes('RLS')) {
            throw new Error('RLS policies not found');
        }
    });
}

// ============================================================================
// 2. API ROUTES TESTS
// ============================================================================

async function testAPIRoutes() {
    console.log('\n🔌 Testing API Routes...\n');

    test('API Routes: favorites route exists', () => {
        const fs = require('fs');
        const path = require('path');
        const routePath = path.join(__dirname, '../apps/web/app/api/favorites/route.ts');
        
        if (!fs.existsSync(routePath)) {
            throw new Error('favorites/route.ts not found');
        }

        const content = fs.readFileSync(routePath, 'utf-8');
        
        if (!content.includes('GET') || !content.includes('POST') || !content.includes('DELETE')) {
            throw new Error('Required HTTP methods not found');
        }

        if (!content.includes('withAuthAndRateLimit')) {
            throw new Error('Rate limiting not implemented');
        }
    });

    test('API Routes: favorites/[listingId] route exists', () => {
        const fs = require('fs');
        const path = require('path');
        const routePath = path.join(__dirname, '../apps/web/app/api/favorites/[listingId]/route.ts');
        
        if (!fs.existsSync(routePath)) {
            throw new Error('favorites/[listingId]/route.ts not found');
        }

        const content = fs.readFileSync(routePath, 'utf-8');
        
        if (!content.includes('GET')) {
            throw new Error('GET method not found');
        }
    });

    test('API Routes: alerts route exists', () => {
        const fs = require('fs');
        const path = require('path');
        const routePath = path.join(__dirname, '../apps/web/app/api/alerts/route.ts');
        
        if (!fs.existsSync(routePath)) {
            throw new Error('alerts/route.ts not found');
        }

        const content = fs.readFileSync(routePath, 'utf-8');
        
        if (!content.includes('GET') || !content.includes('POST')) {
            throw new Error('Required HTTP methods not found');
        }
    });

    test('API Routes: alerts/[id] route exists', () => {
        const fs = require('fs');
        const path = require('path');
        const routePath = path.join(__dirname, '../apps/web/app/api/alerts/[id]/route.ts');
        
        if (!fs.existsSync(routePath)) {
            throw new Error('alerts/[id]/route.ts not found');
        }

        const content = fs.readFileSync(routePath, 'utf-8');
        
        if (!content.includes('PATCH') || !content.includes('DELETE')) {
            throw new Error('Required HTTP methods not found');
        }
    });
}

// ============================================================================
// 3. HOOKS TESTS
// ============================================================================

async function testHooks() {
    console.log('\n🪝 Testing React Query Hooks...\n');

    test('Hooks: use-favorites.ts exists', () => {
        const fs = require('fs');
        const path = require('path');
        const hookPath = path.join(__dirname, '../apps/web/lib/hooks/use-favorites.ts');
        
        if (!fs.existsSync(hookPath)) {
            throw new Error('use-favorites.ts not found');
        }

        const content = fs.readFileSync(hookPath, 'utf-8');
        
        if (!content.includes('useFavorites') || !content.includes('useIsFavorited') || !content.includes('useToggleFavorite')) {
            throw new Error('Required hooks not found');
        }
    });

    test('Hooks: use-alerts.ts exists', () => {
        const fs = require('fs');
        const path = require('path');
        const hookPath = path.join(__dirname, '../apps/web/lib/hooks/use-alerts.ts');
        
        if (!fs.existsSync(hookPath)) {
            throw new Error('use-alerts.ts not found');
        }

        const content = fs.readFileSync(hookPath, 'utf-8');
        
        if (!content.includes('useAlerts') || !content.includes('useCreateAlert') || !content.includes('useUpdateAlert') || !content.includes('useDeleteAlert')) {
            throw new Error('Required hooks not found');
        }
    });
}

// ============================================================================
// 4. UI COMPONENTS TESTS
// ============================================================================

async function testUIComponents() {
    console.log('\n🎨 Testing UI Components...\n');

    test('UI Components: FavoriteButton exists', () => {
        const fs = require('fs');
        const path = require('path');
        const componentPath = path.join(__dirname, '../apps/web/components/FavoriteButton.tsx');
        
        if (!fs.existsSync(componentPath)) {
            throw new Error('FavoriteButton.tsx not found');
        }

        const content = fs.readFileSync(componentPath, 'utf-8');
        
        if (!content.includes('FavoriteButton')) {
            throw new Error('FavoriteButton component not found');
        }

        if (!content.includes('useIsFavorited') || !content.includes('useToggleFavorite')) {
            throw new Error('Required hooks not used');
        }
    });
}

// ============================================================================
// 5. PAGES TESTS
// ============================================================================

async function testPages() {
    console.log('\n📄 Testing Pages...\n');

    test('Pages: favorites/page.tsx exists', () => {
        const fs = require('fs');
        const path = require('path');
        const pagePath = path.join(__dirname, '../apps/web/app/favorites/page.tsx');
        
        if (!fs.existsSync(pagePath)) {
            throw new Error('favorites/page.tsx not found');
        }

        const content = fs.readFileSync(pagePath, 'utf-8');
        
        if (!content.includes('useFavorites')) {
            throw new Error('useFavorites hook not used');
        }

        if (!content.includes('FavoriteButton')) {
            throw new Error('FavoriteButton component not used');
        }
    });

    test('Pages: alerts/page.tsx exists', () => {
        const fs = require('fs');
        const path = require('path');
        const pagePath = path.join(__dirname, '../apps/web/app/alerts/page.tsx');
        
        if (!fs.existsSync(pagePath)) {
            throw new Error('alerts/page.tsx not found');
        }

        const content = fs.readFileSync(pagePath, 'utf-8');
        
        if (!content.includes('useAlerts')) {
            throw new Error('useAlerts hook not used');
        }
    });
}

// ============================================================================
// 6. NAVIGATION TESTS
// ============================================================================

async function testNavigation() {
    console.log('\n🧭 Testing Navigation...\n');

    test('Navigation: Favorites link in NavBarClient', () => {
        const fs = require('fs');
        const path = require('path');
        const navPath = path.join(__dirname, '../apps/web/components/NavBarClient.tsx');
        
        if (!fs.existsSync(navPath)) {
            throw new Error('NavBarClient.tsx not found');
        }

        const content = fs.readFileSync(navPath, 'utf-8');
        
        if (!content.includes('/favorites') || !content.includes('favorites')) {
            throw new Error('Favorites link not found in NavBarClient');
        }
    });

    test('Navigation: Favorites link in MobileMenu', () => {
        const fs = require('fs');
        const path = require('path');
        const menuPath = path.join(__dirname, '../apps/web/components/MobileMenu.tsx');
        
        if (!fs.existsSync(menuPath)) {
            throw new Error('MobileMenu.tsx not found');
        }

        const content = fs.readFileSync(menuPath, 'utf-8');
        
        if (!content.includes('/favorites') || !content.includes('favorites')) {
            throw new Error('Favorites link not found in MobileMenu');
        }
    });
}

// ============================================================================
// 7. TRANSLATIONS TESTS
// ============================================================================

async function testTranslations() {
    console.log('\n🌐 Testing Translations...\n');

    test('Translations: Favorites labels exist in French', () => {
        const fs = require('fs');
        const path = require('path');
        const translationsPath = path.join(__dirname, '../apps/web/lib/i18n/translations.ts');
        
        const content = fs.readFileSync(translationsPath, 'utf-8');
        
        const requiredKeys = [
            'favorites',
            'myFavorites',
            'favoriteAdded',
            'favoriteRemoved',
            'addFavorite',
            'removeFavorite',
        ];

        for (const key of requiredKeys) {
            if (!content.includes(`${key}:`)) {
                throw new Error(`Translation key '${key}' not found in French`);
            }
        }
    });

    test('Translations: Alerts labels exist in French', () => {
        const fs = require('fs');
        const path = require('path');
        const translationsPath = path.join(__dirname, '../apps/web/lib/i18n/translations.ts');
        
        const content = fs.readFileSync(translationsPath, 'utf-8');
        
        const requiredKeys = [
            'myAlerts',
            'createAlert',
            'alertActivated',
            'alertDeactivated',
            'alertDeleted',
        ];

        for (const key of requiredKeys) {
            if (!content.includes(`${key}:`)) {
                throw new Error(`Translation key '${key}' not found in French`);
            }
        }
    });
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function main() {
    console.log('🧪 Phase 3.1 Test Suite - Favorites & Alerts\n');
    console.log('='.repeat(60));

    await testMigration();
    await testAPIRoutes();
    await testHooks();
    await testUIComponents();
    await testPages();
    await testNavigation();
    await testTranslations();

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Test Summary\n');

    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`📈 Total: ${results.length}\n`);

    if (failed > 0) {
        console.log('❌ Failed Tests:\n');
        results
            .filter(r => r.status === 'failed')
            .forEach(r => {
                console.log(`   • ${r.name}`);
                if (r.message) {
                    console.log(`     ${r.message}\n`);
                }
            });
    }

    process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});

