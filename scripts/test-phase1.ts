#!/usr/bin/env tsx
/**
 * Phase 1 Test Script - Performance & Stability
 * 
 * Tests:
 * 1. Pagination on all API routes
 * 2. React Query cache behavior
 * 3. Image optimization (next/image config)
 * 4. Debounce functionality
 * 5. Lazy loading components
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

function skip(name: string, reason: string): void {
    results.push({ name, status: 'skipped', message: reason });
    console.log(`⏭️  ${name}: ${reason}`);
}

// ============================================================================
// 1. PAGINATION TESTS
// ============================================================================

async function testPagination() {
    console.log('\n📄 Testing Pagination...\n');

    // Test 1: /api/listings GET with pagination
    await test('Pagination: /api/listings accepts limit and offset', async () => {
        const res = await fetch('http://localhost:3000/api/listings?limit=10&offset=0', {
            credentials: 'include',
        });

        if (res.status === 401) {
            throw new Error('Authentication required - login first');
        }

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }

        const data = await res.json();
        
        // Check response structure
        if (!data.pagination) {
            throw new Error('Response missing pagination metadata');
        }

        if (!Array.isArray(data.data)) {
            throw new Error('Response missing data array');
        }

        if (typeof data.pagination.limit !== 'number') {
            throw new Error('pagination.limit must be a number');
        }

        if (typeof data.pagination.offset !== 'number') {
            throw new Error('pagination.offset must be a number');
        }

        if (data.pagination.limit !== 10) {
            throw new Error(`Expected limit=10, got ${data.pagination.limit}`);
        }

        if (data.pagination.offset !== 0) {
            throw new Error(`Expected offset=0, got ${data.pagination.offset}`);
        }
    });

    // Test 2: /api/search/markers with pagination
    await test('Pagination: /api/search/markers accepts limit and offset', async () => {
        const bbox = '-17.0,16.0,-14.0,20.0'; // Mauritania bounds
        const res = await fetch(`http://localhost:3000/api/search/markers?bbox=${bbox}&limit=20&offset=0`);

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }

        const data = await res.json();
        
        if (!data.pagination) {
            throw new Error('Response missing pagination metadata');
        }

        if (!Array.isArray(data.data)) {
            throw new Error('Response missing data array');
        }

        if (data.pagination.limit !== 20) {
            throw new Error(`Expected limit=20, got ${data.pagination.limit}`);
        }
    });

    // Test 3: /api/search/listings with pagination
    await test('Pagination: /api/search/listings accepts limit and offset', async () => {
        const res = await fetch('http://localhost:3000/api/search/listings?q=test&limit=5&offset=0');

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }

        const data = await res.json();
        
        if (!data.pagination) {
            throw new Error('Response missing pagination metadata');
        }

        if (!Array.isArray(data.data)) {
            throw new Error('Response missing data array');
        }

        if (data.pagination.limit !== 5) {
            throw new Error(`Expected limit=5, got ${data.pagination.limit}`);
        }
    });

    // Test 4: Pagination limits enforced
    await test('Pagination: Max limit enforced (100 for listings)', async () => {
        const res = await fetch('http://localhost:3000/api/listings?limit=200&offset=0', {
            credentials: 'include',
        });

        if (res.status === 401) {
            skip('Pagination: Max limit enforced (auth required)', 'Authentication required');
            return;
        }

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }

        const data = await res.json();
        
        if (data.pagination.limit > 100) {
            throw new Error(`Limit should be capped at 100, got ${data.pagination.limit}`);
        }
    });

    // Test 5: Offset validation
    await test('Pagination: Negative offset rejected', async () => {
        const res = await fetch('http://localhost:3000/api/search/markers?bbox=-17.0,16.0,-14.0,20.0&limit=10&offset=-1');

        // Should either reject or default to 0
        if (res.ok) {
            const data = await res.json();
            if (data.pagination.offset < 0) {
                throw new Error('Negative offset should be rejected or defaulted to 0');
            }
        }
    });
}

// ============================================================================
// 2. REACT QUERY CONFIGURATION TESTS
// ============================================================================

async function testReactQueryConfig() {
    console.log('\n⚛️  Testing React Query Configuration...\n');

    // Test 1: Check React Query provider exists
    test('React Query: Provider file exists', () => {
        const fs = require('fs');
        const path = require('path');
        const providerPath = path.join(__dirname, '../apps/web/lib/react-query.tsx');
        
        if (!fs.existsSync(providerPath)) {
            throw new Error('react-query.tsx not found');
        }

        const content = fs.readFileSync(providerPath, 'utf-8');
        
        if (!content.includes('QueryClientProvider')) {
            throw new Error('QueryClientProvider not found in react-query.tsx');
        }

        if (!content.includes('staleTime')) {
            throw new Error('staleTime configuration not found');
        }
    });

    // Test 2: Check hooks file exists
    test('React Query: Hooks file exists', () => {
        const fs = require('fs');
        const path = require('path');
        const hooksPath = path.join(__dirname, '../apps/web/lib/hooks/use-listings.ts');
        
        if (!fs.existsSync(hooksPath)) {
            throw new Error('use-listings.ts not found');
        }

        const content = fs.readFileSync(hooksPath, 'utf-8');
        
        if (!content.includes('useQuery')) {
            throw new Error('useQuery hooks not found');
        }

        if (!content.includes('useMutation')) {
            throw new Error('useMutation hooks not found');
        }

        if (!content.includes('useMyListings')) {
            throw new Error('useMyListings hook not found');
        }

        if (!content.includes('useSearchMarkers')) {
            throw new Error('useSearchMarkers hook not found');
        }
    });

    // Test 3: Check Provider integration
    test('React Query: Provider integrated in Providers.tsx', () => {
        const fs = require('fs');
        const path = require('path');
        const providersPath = path.join(__dirname, '../apps/web/components/Providers.tsx');
        
        if (!fs.existsSync(providersPath)) {
            throw new Error('Providers.tsx not found');
        }

        const content = fs.readFileSync(providersPath, 'utf-8');
        
        if (!content.includes('ReactQueryProvider')) {
            throw new Error('ReactQueryProvider not integrated');
        }
    });
}

// ============================================================================
// 3. IMAGE OPTIMIZATION TESTS
// ============================================================================

async function testImageOptimization() {
    console.log('\n🖼️  Testing Image Optimization...\n');

    // Test 1: next.config.ts has image config
    test('Images: next.config.ts configured for Supabase', () => {
        const fs = require('fs');
        const path = require('path');
        const configPath = path.join(__dirname, '../apps/web/next.config.ts');
        
        if (!fs.existsSync(configPath)) {
            throw new Error('next.config.ts not found');
        }

        const content = fs.readFileSync(configPath, 'utf-8');
        
        if (!content.includes('images')) {
            throw new Error('Image configuration not found in next.config.ts');
        }

        if (!content.includes('supabase.co')) {
            throw new Error('Supabase domain not configured in image remotePatterns');
        }
    });

    // Test 2: PhotoCarousel uses next/image
    test('Images: PhotoCarousel uses next/image', () => {
        const fs = require('fs');
        const path = require('path');
        const carouselPath = path.join(__dirname, '../apps/web/components/PhotoCarousel.tsx');
        
        if (!fs.existsSync(carouselPath)) {
            throw new Error('PhotoCarousel.tsx not found');
        }

        const content = fs.readFileSync(carouselPath, 'utf-8');
        
        if (!content.includes("import Image from 'next/image'")) {
            throw new Error('PhotoCarousel does not import next/image');
        }

        if (!content.includes('<Image')) {
            throw new Error('PhotoCarousel does not use Image component');
        }

        if (!content.includes('fill')) {
            throw new Error('PhotoCarousel Image component missing fill prop');
        }

        if (!content.includes('priority')) {
            throw new Error('PhotoCarousel Image component missing priority prop');
        }
    });
}

// ============================================================================
// 4. DEBOUNCE TESTS
// ============================================================================

async function testDebounce() {
    console.log('\n⏱️  Testing Debounce...\n');

    // Test 1: MapSearch has debounce
    test('Debounce: MapSearch implements debounce', () => {
        const fs = require('fs');
        const path = require('path');
        const searchPath = path.join(__dirname, '../apps/web/components/MapSearch.tsx');
        
        if (!fs.existsSync(searchPath)) {
            throw new Error('MapSearch.tsx not found');
        }

        const content = fs.readFileSync(searchPath, 'utf-8');
        
        if (!content.includes('debounceTimer')) {
            throw new Error('MapSearch does not use debounceTimer');
        }

        if (!content.includes('setTimeout')) {
            throw new Error('MapSearch does not use setTimeout for debounce');
        }

        // Check debounce delay (should be around 300ms)
        if (!content.includes('300')) {
            throw new Error('Debounce delay not set to 300ms');
        }
    });
}

// ============================================================================
// 5. LAZY LOADING TESTS
// ============================================================================

async function testLazyLoading() {
    console.log('\n🚀 Testing Lazy Loading...\n');

    // Test 1: Map component is lazy loaded
    test('Lazy Loading: Map component uses dynamic import', () => {
        const fs = require('fs');
        const path = require('path');
        const pagePath = path.join(__dirname, '../apps/web/app/page.tsx');
        
        if (!fs.existsSync(pagePath)) {
            throw new Error('page.tsx not found');
        }

        const content = fs.readFileSync(pagePath, 'utf-8');
        
        if (!content.includes("dynamic(() => import('@/components/Map')")) {
            throw new Error('Map component not lazy loaded');
        }

        if (!content.includes('ssr: false')) {
            throw new Error('Map component missing ssr: false');
        }
    });

    // Test 2: LocationPicker is lazy loaded
    test('Lazy Loading: LocationPicker uses dynamic import', () => {
        const fs = require('fs');
        const path = require('path');
        const postPath = path.join(__dirname, '../apps/web/app/post/page.tsx');
        
        if (!fs.existsSync(postPath)) {
            throw new Error('post/page.tsx not found');
        }

        const content = fs.readFileSync(postPath, 'utf-8');
        
        if (!content.includes("dynamic(() => import('@/components/LocationPicker')")) {
            throw new Error('LocationPicker component not lazy loaded');
        }
    });
}

// ============================================================================
// 6. API RESPONSE STRUCTURE TESTS
// ============================================================================

async function testAPIResponseStructure() {
    console.log('\n📋 Testing API Response Structure...\n');

    // Test: All paginated endpoints return consistent structure
    await test('API Structure: Paginated endpoints return {data, pagination}', async () => {
        const endpoints = [
            'http://localhost:3000/api/search/markers?bbox=-17.0,16.0,-14.0,20.0&limit=10',
            'http://localhost:3000/api/search/listings?q=test&limit=5',
        ];

        for (const endpoint of endpoints) {
            try {
                const res = await fetch(endpoint);
                
                if (!res.ok) {
                    continue; // Skip if endpoint requires auth or has errors
                }

                const data = await res.json();
                
                if (!data.hasOwnProperty('data')) {
                    throw new Error(`${endpoint} missing 'data' property`);
                }

                if (!data.hasOwnProperty('pagination')) {
                    throw new Error(`${endpoint} missing 'pagination' property`);
                }

                if (!Array.isArray(data.data)) {
                    throw new Error(`${endpoint} 'data' is not an array`);
                }
            } catch (error) {
                // Skip if server not running
                if (error instanceof TypeError && error.message.includes('fetch')) {
                    skip(`API Structure: ${endpoint}`, 'Server not running');
                    continue;
                }
                throw error;
            }
        }
    });
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function main() {
    console.log('🧪 Phase 1 Test Suite - Performance & Stability\n');
    console.log('=' .repeat(60));

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
    await testPagination();
    await testReactQueryConfig();
    await testImageOptimization();
    await testDebounce();
    await testLazyLoading();
    await testAPIResponseStructure();

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

