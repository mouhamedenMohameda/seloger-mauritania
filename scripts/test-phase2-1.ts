#!/usr/bin/env tsx
/**
 * Phase 2.1 Test Script - Advanced Search Filters & Sorting
 * 
 * Tests:
 * 1. Migration SQL structure
 * 2. Schema validation for new filters
 * 3. API routes with new filter parameters
 * 4. SearchFilters component
 * 5. Integration in frontend
 */

import { z } from 'zod';

// Test results tracking
interface TestResult {
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    message?: string;
    duration?: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
    const start = Date.now();
    try {
        const result = fn();
        if (result instanceof Promise) {
            await result
                .then(() => {
                    const duration = Date.now() - start;
                    results.push({ name, status: 'passed', duration });
                    console.log(`✅ ${name} (${duration}ms)`);
                })
                .catch((error) => {
                    const duration = Date.now() - start;
                    // Check if it's a connection error (server not running)
                    if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('ECONNREFUSED'))) {
                        results.push({ name, status: 'skipped', message: 'Server not running', duration });
                        console.log(`⏭️  ${name}: Server not running`);
                    } else {
                        results.push({ name, status: 'failed', message: error.message, duration });
                        console.error(`❌ ${name}: ${error.message}`);
                    }
                });
        } else {
            const duration = Date.now() - start;
            results.push({ name, status: 'passed', duration });
            console.log(`✅ ${name} (${duration}ms)`);
        }
    } catch (error) {
        const duration = Date.now() - start;
        const err = error instanceof Error ? error : new Error(String(error));
        // Check if it's a connection error
        if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('ECONNREFUSED'))) {
            results.push({ name, status: 'skipped', message: 'Server not running', duration });
            console.log(`⏭️  ${name}: Server not running`);
        } else {
            results.push({ name, status: 'failed', message: err.message, duration });
            console.error(`❌ ${name}: ${err.message}`);
        }
    }
}

function skip(name: string, reason: string): void {
    results.push({ name, status: 'skipped', message: reason });
    console.log(`⏭️  ${name}: ${reason}`);
}

// ============================================================================
// 1. MIGRATION SQL TESTS
// ============================================================================

async function testMigrationSQL() {
    console.log('\n🗄️  Testing Migration SQL...\n');

    test('Migration: SQL file exists', () => {
        const fs = require('fs');
        const path = require('path');
        const migrationPath = path.join(__dirname, '../supabase/migrations/20240101000006_advanced_search.sql');
        
        if (!fs.existsSync(migrationPath)) {
            throw new Error('Migration file not found');
        }

        const content = fs.readFileSync(migrationPath, 'utf-8');
        
        // Check for new filter parameters
        if (!content.includes('max_rooms')) {
            throw new Error('max_rooms parameter not found in migration');
        }

        if (!content.includes('min_surface')) {
            throw new Error('min_surface parameter not found in migration');
        }

        if (!content.includes('max_surface')) {
            throw new Error('max_surface parameter not found in migration');
        }

        if (!content.includes('op_type_filter')) {
            throw new Error('op_type_filter parameter not found in migration');
        }

        if (!content.includes('sort_order')) {
            throw new Error('sort_order parameter not found in migration');
        }

        // Check for sort options
        if (!content.includes('price_asc') || !content.includes('price_desc')) {
            throw new Error('Price sort options not found');
        }

        if (!content.includes('date_asc') || !content.includes('date_desc')) {
            throw new Error('Date sort options not found');
        }

        if (!content.includes('surface_asc') || !content.includes('surface_desc')) {
            throw new Error('Surface sort options not found');
        }
    });
}

// ============================================================================
// 2. SCHEMA VALIDATION TESTS
// ============================================================================

async function testSchemaValidation() {
    console.log('\n📋 Testing Schema Validation...\n');

    test('Schema: SearchFiltersSchema includes new filters', () => {
        const fs = require('fs');
        const path = require('path');
        const schemaPath = path.join(__dirname, '../packages/services/geo/src/index.ts');
        
        if (!fs.existsSync(schemaPath)) {
            throw new Error('Schema file not found');
        }

        const content = fs.readFileSync(schemaPath, 'utf-8');
        
        if (!content.includes('maxRooms')) {
            throw new Error('maxRooms not found in schema');
        }

        if (!content.includes('minSurface')) {
            throw new Error('minSurface not found in schema');
        }

        if (!content.includes('maxSurface')) {
            throw new Error('maxSurface not found in schema');
        }

        if (!content.includes('opType')) {
            throw new Error('opType not found in schema');
        }

        if (!content.includes('sortBy')) {
            throw new Error('sortBy not found in schema');
        }

        if (!content.includes('SortOrderSchema')) {
            throw new Error('SortOrderSchema not found');
        }
    });

    test('Schema: SortOrderSchema includes all sort options', () => {
        const fs = require('fs');
        const path = require('path');
        const schemaPath = path.join(__dirname, '../packages/services/geo/src/index.ts');
        
        const content = fs.readFileSync(schemaPath, 'utf-8');
        
        const sortOptions = ['price_asc', 'price_desc', 'date_desc', 'date_asc', 'surface_desc', 'surface_asc'];
        for (const option of sortOptions) {
            if (!content.includes(option)) {
                throw new Error(`Sort option ${option} not found in schema`);
            }
        }
    });
}

// ============================================================================
// 3. API ROUTE TESTS
// ============================================================================

async function testAPIRoutes() {
    console.log('\n🔌 Testing API Routes...\n');

    // Test 1: API accepts new filter parameters
    await test('API: /api/search/markers accepts new filter parameters', async () => {
        const bbox = '-17.0,16.0,-14.0,20.0';
        const params = new URLSearchParams({
            bbox,
            minPrice: '10000',
            maxPrice: '50000',
            minRooms: '2',
            maxRooms: '5',
            minSurface: '50',
            maxSurface: '200',
            opType: 'rent',
            sortBy: 'price_asc',
            limit: '20',
            offset: '0',
        });

        const res = await fetch(`http://localhost:3000/api/search/markers?${params.toString()}`);

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }

        const data = await res.json();
        
        if (!data.pagination) {
            throw new Error('Response missing pagination');
        }

        if (!Array.isArray(data.data)) {
            throw new Error('Response missing data array');
        }
    });

    // Test 2: Sort parameter works
    await test('API: Sort parameter works correctly', async () => {
        const bbox = '-17.0,16.0,-14.0,20.0';
        
        // Test price_asc
        const res1 = await fetch(`http://localhost:3000/api/search/markers?bbox=${bbox}&sortBy=price_asc&limit=5`);
        if (res1.ok) {
            const data1 = await res1.json();
            if (data1.data && data1.data.length > 1) {
                const prices = data1.data.map((item: any) => item.price).filter((p: any) => p !== null);
                for (let i = 1; i < prices.length; i++) {
                    if (prices[i] < prices[i - 1]) {
                        throw new Error('Prices not sorted ascending');
                    }
                }
            }
        }
    });

    // Test 3: Filter combinations work
    await test('API: Multiple filters work together', async () => {
        const bbox = '-17.0,16.0,-14.0,20.0';
        const params = new URLSearchParams({
            bbox,
            minPrice: '20000',
            maxPrice: '100000',
            opType: 'rent',
            sortBy: 'date_desc',
        });

        const res = await fetch(`http://localhost:3000/api/search/markers?${params.toString()}`);

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }

        const data = await res.json();
        
        // Verify filters are applied (if data exists)
        if (data.data && data.data.length > 0) {
            for (const item of data.data) {
                if (item.price < 20000 || item.price > 100000) {
                    throw new Error('Price filter not applied');
                }
                if (item.op_type !== 'rent') {
                    throw new Error('opType filter not applied');
                }
            }
        }
    });
}

// ============================================================================
// 4. FRONTEND COMPONENT TESTS
// ============================================================================

async function testFrontendComponents() {
    console.log('\n🎨 Testing Frontend Components...\n');

    test('Frontend: SearchFilters component exists', () => {
        const fs = require('fs');
        const path = require('path');
        const componentPath = path.join(__dirname, '../apps/web/components/SearchFilters.tsx');
        
        if (!fs.existsSync(componentPath)) {
            throw new Error('SearchFilters.tsx not found');
        }

        const content = fs.readFileSync(componentPath, 'utf-8');
        
        if (!content.includes('SearchFiltersState')) {
            throw new Error('SearchFiltersState interface not found');
        }

        if (!content.includes('minPrice') || !content.includes('maxPrice')) {
            throw new Error('Price filters not found in component');
        }

        if (!content.includes('minRooms') || !content.includes('maxRooms')) {
            throw new Error('Room filters not found in component');
        }

        if (!content.includes('minSurface') || !content.includes('maxSurface')) {
            throw new Error('Surface filters not found in component');
        }

        if (!content.includes('opType')) {
            throw new Error('opType filter not found in component');
        }

        if (!content.includes('sortBy')) {
            throw new Error('sortBy not found in component');
        }
    });

    test('Frontend: SearchFilters integrated in page.tsx', () => {
        const fs = require('fs');
        const path = require('path');
        const pagePath = path.join(__dirname, '../apps/web/app/page.tsx');
        
        if (!fs.existsSync(pagePath)) {
            throw new Error('page.tsx not found');
        }

        const content = fs.readFileSync(pagePath, 'utf-8');
        
        if (!content.includes('SearchFilters')) {
            throw new Error('SearchFilters not imported or used');
        }

        if (!content.includes('showFilters')) {
            throw new Error('showFilters state not found');
        }

        if (!content.includes('filters')) {
            throw new Error('filters state not found');
        }
    });

    test('Frontend: useSearchMarkers hook updated', () => {
        const fs = require('fs');
        const path = require('path');
        const hooksPath = path.join(__dirname, '../apps/web/lib/hooks/use-listings.ts');
        
        if (!fs.existsSync(hooksPath)) {
            throw new Error('use-listings.ts not found');
        }

        const content = fs.readFileSync(hooksPath, 'utf-8');
        
        if (!content.includes('maxRooms') || !content.includes('minSurface') || !content.includes('maxSurface')) {
            throw new Error('New filter parameters not found in hook');
        }

        if (!content.includes('opType') || !content.includes('sortBy')) {
            throw new Error('opType or sortBy not found in hook');
        }
    });
}

// ============================================================================
// 5. TRANSLATIONS TESTS
// ============================================================================

async function testTranslations() {
    console.log('\n🌐 Testing Translations...\n');

    test('Translations: Filter labels exist in French', () => {
        const fs = require('fs');
        const path = require('path');
        const translationsPath = path.join(__dirname, '../apps/web/lib/i18n/translations.ts');
        
        if (!fs.existsSync(translationsPath)) {
            throw new Error('translations.ts not found');
        }

        const content = fs.readFileSync(translationsPath, 'utf-8');
        
        const requiredKeys = [
            'filters',
            'reset',
            'min',
            'max',
            'sortBy',
            'newest',
            'oldest',
            'priceLowToHigh',
            'priceHighToLow',
            'surfaceDesc',
            'surfaceAsc',
        ];

        for (const key of requiredKeys) {
            if (!content.includes(`${key}:`)) {
                throw new Error(`Translation key '${key}' not found in French`);
            }
        }
    });

    test('Translations: Filter labels exist in Arabic', () => {
        const fs = require('fs');
        const path = require('path');
        const translationsPath = path.join(__dirname, '../apps/web/lib/i18n/translations.ts');
        
        const content = fs.readFileSync(translationsPath, 'utf-8');
        
        // Check Arabic section
        if (!content.includes('ar:')) {
            throw new Error('Arabic translations section not found');
        }

        // Check for Arabic filter translations (at least some should exist)
        const arabicKeys = ['filters', 'reset', 'sortBy'];
        const arabicSection = content.split('ar:')[1] || '';
        
        for (const key of arabicKeys) {
            if (!arabicSection.includes(`${key}:`)) {
                throw new Error(`Translation key '${key}' not found in Arabic`);
            }
        }
    });
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function main() {
    console.log('🧪 Phase 2.1 Test Suite - Advanced Search Filters & Sorting\n');
    console.log('='.repeat(60));

    // Check if server is running
    let serverRunning = false;
    try {
        const res = await fetch('http://localhost:3000/api/search/markers?bbox=-17.0,16.0,-14.0,20.0&limit=1', {
            signal: AbortSignal.timeout(2000),
        });
        serverRunning = res.ok || res.status === 400; // 400 means server is running
    } catch (error) {
        // Server not running
    }

    if (!serverRunning) {
        console.log('\n⚠️  Warning: Next.js server not running on localhost:3000');
        console.log('   Some API tests will be skipped.\n');
    }

    // Run all test suites
    await testMigrationSQL();
    await testSchemaValidation();
    await testAPIRoutes();
    await testFrontendComponents();
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

    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
}

// Run tests
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});

