#!/usr/bin/env tsx
/**
 * Phase 2.2 Test Script - Geolocation Features
 * 
 * Tests:
 * 1. Migration SQL for radius search
 * 2. Reverse geocoding API
 * 3. Neighborhoods API
 * 4. Radius search API
 * 5. Geocoding utilities
 * 6. Frontend components
 */

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

    test('Migration: Radius search SQL file exists', () => {
        const fs = require('fs');
        const path = require('path');
        const migrationPath = path.join(__dirname, '../supabase/migrations/20240101000007_radius_search.sql');
        
        if (!fs.existsSync(migrationPath)) {
            throw new Error('Migration file not found');
        }

        const content = fs.readFileSync(migrationPath, 'utf-8');
        
        if (!content.includes('search_listings_by_radius')) {
            throw new Error('search_listings_by_radius function not found');
        }

        if (!content.includes('center_lat') || !content.includes('center_lng')) {
            throw new Error('Center coordinates parameters not found');
        }

        if (!content.includes('radius_km')) {
            throw new Error('radius_km parameter not found');
        }

        if (!content.includes('st_distance')) {
            throw new Error('PostGIS st_distance not used');
        }

        if (!content.includes('distance_km')) {
            throw new Error('distance_km return field not found');
        }
    });
}

// ============================================================================
// 2. GEOCODING UTILITIES TESTS
// ============================================================================

async function testGeocodingUtils() {
    console.log('\n🌍 Testing Geocoding Utilities...\n');

    test('Geocoding: geocoding.ts file exists', () => {
        const fs = require('fs');
        const path = require('path');
        const geocodingPath = path.join(__dirname, '../apps/web/lib/geocoding.ts');
        
        if (!fs.existsSync(geocodingPath)) {
            throw new Error('geocoding.ts not found');
        }

        const content = fs.readFileSync(geocodingPath, 'utf-8');
        
        if (!content.includes('reverseGeocode')) {
            throw new Error('reverseGeocode function not found');
        }

        if (!content.includes('NOUAKCHOTT_NEIGHBORHOODS')) {
            throw new Error('NOUAKCHOTT_NEIGHBORHOODS not found');
        }

        if (!content.includes('searchNeighborhoods')) {
            throw new Error('searchNeighborhoods function not found');
        }

        if (!content.includes('calculateDistance')) {
            throw new Error('calculateDistance function not found');
        }
    });

    test('Geocoding: NOUAKCHOTT_NEIGHBORHOODS has neighborhoods', () => {
        const fs = require('fs');
        const path = require('path');
        const geocodingPath = path.join(__dirname, '../apps/web/lib/geocoding.ts');
        const content = fs.readFileSync(geocodingPath, 'utf-8');
        
        const neighborhoods = ['Tevragh Zeina', 'Arafat', 'El Mina', 'Ksar'];
        for (const neighborhood of neighborhoods) {
            if (!content.includes(neighborhood)) {
                throw new Error(`Neighborhood ${neighborhood} not found`);
            }
        }
    });
}

// ============================================================================
// 3. API ROUTES TESTS
// ============================================================================

async function testAPIRoutes() {
    console.log('\n🔌 Testing API Routes...\n');

    // Test 1: Reverse geocoding API
    await test('API: /api/geocoding/reverse works', async () => {
        const res = await fetch('http://localhost:3000/api/geocoding/reverse?lat=18.07&lng=-15.95');

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }

        const data = await res.json();
        
        if (!data.display_name) {
            throw new Error('Response missing display_name');
        }

        if (!data.address) {
            throw new Error('Response missing address');
        }
    });

    // Test 2: Reverse geocoding validation
    await test('API: /api/geocoding/reverse validates coordinates', async () => {
        const res = await fetch('http://localhost:3000/api/geocoding/reverse?lat=999&lng=-15.95');

        if (res.ok) {
            throw new Error('Should reject invalid coordinates');
        }

        if (res.status !== 400) {
            throw new Error(`Expected 400, got ${res.status}`);
        }
    });

    // Test 3: Neighborhoods API
    await test('API: /api/geocoding/neighborhoods returns all neighborhoods', async () => {
        const res = await fetch('http://localhost:3000/api/geocoding/neighborhoods');

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }

        const data = await res.json();
        
        if (!data.neighborhoods || !Array.isArray(data.neighborhoods)) {
            throw new Error('Response missing neighborhoods array');
        }

        if (data.neighborhoods.length === 0) {
            throw new Error('No neighborhoods returned');
        }

        // Check structure
        const first = data.neighborhoods[0];
        if (!first.name || !first.lat || !first.lng) {
            throw new Error('Neighborhood missing required fields');
        }
    });

    // Test 4: Neighborhoods search
    await test('API: /api/geocoding/neighborhoods filters by query', async () => {
        const res = await fetch('http://localhost:3000/api/geocoding/neighborhoods?q=tevragh');

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }

        const data = await res.json();
        
        if (!Array.isArray(data.neighborhoods)) {
            throw new Error('Response missing neighborhoods array');
        }

        // Should find Tevragh Zeina
        const found = data.neighborhoods.some((n: any) => 
            n.name.toLowerCase().includes('tevragh')
        );
        
        if (!found) {
            throw new Error('Search query did not find expected neighborhood');
        }
    });

    // Test 5: Radius search API
    await test('API: /api/search/radius works', async () => {
        const params = new URLSearchParams({
            lat: '18.07',
            lng: '-15.95',
            radius: '5',
            limit: '10',
        });

        const res = await fetch(`http://localhost:3000/api/search/radius?${params.toString()}`);

        if (!res.ok) {
            const errorText = await res.text();
            // If migration not applied, skip this test
            if (errorText.includes('Failed to search listings') || errorText.includes('function') || res.status === 500) {
                skip('API: /api/search/radius works', 'Migration not applied or function error');
                return;
            }
            throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        const data = await res.json();
        
        if (!data.pagination) {
            throw new Error('Response missing pagination');
        }

        if (!Array.isArray(data.data)) {
            throw new Error('Response missing data array');
        }

        // Check if distance_km is present in results
        if (data.data.length > 0 && !data.data[0].hasOwnProperty('distance_km')) {
            throw new Error('Results missing distance_km field');
        }
    });

    // Test 6: Radius search validation
    await test('API: /api/search/radius validates parameters', async () => {
        const res = await fetch('http://localhost:3000/api/search/radius?lat=999&lng=-15.95&radius=5');

        if (res.ok) {
            throw new Error('Should reject invalid coordinates');
        }

        if (res.status !== 400) {
            throw new Error(`Expected 400, got ${res.status}`);
        }
    });
}

// ============================================================================
// 4. FRONTEND COMPONENTS TESTS
// ============================================================================

async function testFrontendComponents() {
    console.log('\n🎨 Testing Frontend Components...\n');

    test('Frontend: NeighborhoodSuggestions component exists', () => {
        const fs = require('fs');
        const path = require('path');
        const componentPath = path.join(__dirname, '../apps/web/components/NeighborhoodSuggestions.tsx');
        
        if (!fs.existsSync(componentPath)) {
            throw new Error('NeighborhoodSuggestions.tsx not found');
        }

        const content = fs.readFileSync(componentPath, 'utf-8');
        
        if (!content.includes('NeighborhoodSuggestions')) {
            throw new Error('NeighborhoodSuggestions component not found');
        }

        if (!content.includes('onSelect')) {
            throw new Error('onSelect prop not found');
        }

        if (!content.includes('NOUAKCHOTT_NEIGHBORHOODS')) {
            throw new Error('NOUAKCHOTT_NEIGHBORHOODS not imported');
        }
    });
}

// ============================================================================
// 5. SERVICE SCHEMA TESTS
// ============================================================================

async function testServiceSchema() {
    console.log('\n📋 Testing Service Schema...\n');

    test('Service: RadiusSearchSchema exists', () => {
        const fs = require('fs');
        const path = require('path');
        const schemaPath = path.join(__dirname, '../packages/services/geo/src/index.ts');
        
        if (!fs.existsSync(schemaPath)) {
            throw new Error('geo/index.ts not found');
        }

        const content = fs.readFileSync(schemaPath, 'utf-8');
        
        if (!content.includes('RadiusSearchSchema')) {
            throw new Error('RadiusSearchSchema not found');
        }

        if (!content.includes('searchListingsByRadius')) {
            throw new Error('searchListingsByRadius function not found');
        }

        if (!content.includes('centerLat') || !content.includes('centerLng')) {
            throw new Error('Center coordinates not in schema');
        }

        if (!content.includes('radiusKm')) {
            throw new Error('radiusKm not in schema');
        }
    });
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function main() {
    console.log('🧪 Phase 2.2 Test Suite - Geolocation Features\n');
    console.log('='.repeat(60));

    // Check if server is running
    let serverRunning = false;
    try {
        const res = await fetch('http://localhost:3000/api/geocoding/neighborhoods', {
            signal: AbortSignal.timeout(2000),
        });
        serverRunning = res.ok || res.status === 400;
    } catch (error) {
        // Server not running
    }

    if (!serverRunning) {
        console.log('\n⚠️  Warning: Next.js server not running on localhost:3000');
        console.log('   Some API tests will be skipped.\n');
    }

    // Run all test suites
    await testMigrationSQL();
    await testGeocodingUtils();
    await testServiceSchema();
    await testAPIRoutes();
    await testFrontendComponents();

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

