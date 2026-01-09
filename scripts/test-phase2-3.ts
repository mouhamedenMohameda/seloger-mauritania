#!/usr/bin/env tsx
/**
 * Phase 2.3 Test Script - Essential UX
 * 
 * Tests:
 * 1. LoadingState component exists
 * 2. EmptyState component exists
 * 3. ErrorState component exists
 * 4. ConfirmDialog component exists
 * 5. Toast component and system exists
 * 6. Components integrated in pages
 * 7. confirm() replaced with ConfirmDialog
 * 8. Toasts used for feedback
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

function skip(name: string, reason: string): void {
    results.push({ name, status: 'skipped', message: reason });
    console.log(`⏭️  ${name}: ${reason}`);
}

// ============================================================================
// 1. UI COMPONENTS TESTS
// ============================================================================

async function testUIComponents() {
    console.log('\n🎨 Testing UI Components...\n');

    test('UI Components: LoadingState exists', () => {
        const fs = require('fs');
        const path = require('path');
        const componentPath = path.join(__dirname, '../apps/web/components/ui/LoadingState.tsx');
        
        if (!fs.existsSync(componentPath)) {
            throw new Error('LoadingState.tsx not found');
        }

        const content = fs.readFileSync(componentPath, 'utf-8');
        
        if (!content.includes('LoadingState')) {
            throw new Error('LoadingState component not found');
        }

        if (!content.includes('animate-spin')) {
            throw new Error('Loading spinner not found');
        }
    });

    test('UI Components: EmptyState exists', () => {
        const fs = require('fs');
        const path = require('path');
        const componentPath = path.join(__dirname, '../apps/web/components/ui/EmptyState.tsx');
        
        if (!fs.existsSync(componentPath)) {
            throw new Error('EmptyState.tsx not found');
        }

        const content = fs.readFileSync(componentPath, 'utf-8');
        
        if (!content.includes('EmptyState')) {
            throw new Error('EmptyState component not found');
        }

        if (!content.includes('noResults')) {
            throw new Error('noResults prop not found');
        }
    });

    test('UI Components: ErrorState exists', () => {
        const fs = require('fs');
        const path = require('path');
        const componentPath = path.join(__dirname, '../apps/web/components/ui/ErrorState.tsx');
        
        if (!fs.existsSync(componentPath)) {
            throw new Error('ErrorState.tsx not found');
        }

        const content = fs.readFileSync(componentPath, 'utf-8');
        
        if (!content.includes('ErrorState')) {
            throw new Error('ErrorState component not found');
        }

        if (!content.includes('onRetry')) {
            throw new Error('onRetry prop not found');
        }
    });

    test('UI Components: ConfirmDialog exists', () => {
        const fs = require('fs');
        const path = require('path');
        const componentPath = path.join(__dirname, '../apps/web/components/ui/ConfirmDialog.tsx');
        
        if (!fs.existsSync(componentPath)) {
            throw new Error('ConfirmDialog.tsx not found');
        }

        const content = fs.readFileSync(componentPath, 'utf-8');
        
        if (!content.includes('ConfirmDialog')) {
            throw new Error('ConfirmDialog component not found');
        }

        if (!content.includes('isOpen') || !content.includes('onConfirm')) {
            throw new Error('Required props not found');
        }

        if (!content.includes('confirmVariant')) {
            throw new Error('confirmVariant prop not found');
        }
    });

    test('UI Components: Toast exists', () => {
        const fs = require('fs');
        const path = require('path');
        const componentPath = path.join(__dirname, '../apps/web/components/ui/Toast.tsx');
        
        if (!fs.existsSync(componentPath)) {
            throw new Error('Toast.tsx not found');
        }

        const content = fs.readFileSync(componentPath, 'utf-8');
        
        if (!content.includes('Toast')) {
            throw new Error('Toast component not found');
        }

        if (!content.includes('success') || !content.includes('error')) {
            throw new Error('Toast types not found');
        }
    });
}

// ============================================================================
// 2. TOAST SYSTEM TESTS
// ============================================================================

async function testToastSystem() {
    console.log('\n🔔 Testing Toast System...\n');

    test('Toast System: useToast hook exists', () => {
        const fs = require('fs');
        const path = require('path');
        const toastPath = path.join(__dirname, '../apps/web/lib/toast.tsx');
        
        if (!fs.existsSync(toastPath)) {
            throw new Error('toast.tsx not found');
        }

        const content = fs.readFileSync(toastPath, 'utf-8');
        
        if (!content.includes('useToast')) {
            throw new Error('useToast hook not found');
        }

        if (!content.includes('ToastContainer')) {
            throw new Error('ToastContainer not found');
        }

        if (!content.includes('success') || !content.includes('error')) {
            throw new Error('Toast methods not found');
        }
    });

    test('Toast System: ToastContainer integrated in layout', () => {
        const fs = require('fs');
        const path = require('path');
        const layoutPath = path.join(__dirname, '../apps/web/app/layout.tsx');
        
        if (!fs.existsSync(layoutPath)) {
            throw new Error('layout.tsx not found');
        }

        const content = fs.readFileSync(layoutPath, 'utf-8');
        
        if (!content.includes('ToastContainer')) {
            throw new Error('ToastContainer not imported or used in layout');
        }
    });
}

// ============================================================================
// 3. PAGE INTEGRATION TESTS
// ============================================================================

async function testPageIntegration() {
    console.log('\n📄 Testing Page Integration...\n');

    test('Pages: my-listings uses LoadingState', () => {
        const fs = require('fs');
        const path = require('path');
        const pagePath = path.join(__dirname, '../apps/web/app/my-listings/page.tsx');
        
        if (!fs.existsSync(pagePath)) {
            throw new Error('my-listings/page.tsx not found');
        }

        const content = fs.readFileSync(pagePath, 'utf-8');
        
        if (!content.includes('LoadingState')) {
            throw new Error('LoadingState not imported or used');
        }

        if (!content.includes('EmptyState')) {
            throw new Error('EmptyState not imported or used');
        }

        if (!content.includes('ErrorState')) {
            throw new Error('ErrorState not imported or used');
        }

        if (!content.includes('ConfirmDialog')) {
            throw new Error('ConfirmDialog not imported or used');
        }
    });

    test('Pages: my-listings uses useToast', () => {
        const fs = require('fs');
        const path = require('path');
        const pagePath = path.join(__dirname, '../apps/web/app/my-listings/page.tsx');
        
        const content = fs.readFileSync(pagePath, 'utf-8');
        
        if (!content.includes('useToast')) {
            throw new Error('useToast not imported or used');
        }

        if (!content.includes('toast.success') || !content.includes('toast.error')) {
            throw new Error('Toast methods not used');
        }
    });

    test('Pages: my-listings replaced confirm() with ConfirmDialog', () => {
        const fs = require('fs');
        const path = require('path');
        const pagePath = path.join(__dirname, '../apps/web/app/my-listings/page.tsx');
        
        const content = fs.readFileSync(pagePath, 'utf-8');
        
        if (content.includes('confirm(')) {
            throw new Error('confirm() still used, should be replaced with ConfirmDialog');
        }

        if (!content.includes('deleteConfirm')) {
            throw new Error('Delete confirmation state not found');
        }
    });

    test('Pages: post/page uses useToast', () => {
        const fs = require('fs');
        const path = require('path');
        const pagePath = path.join(__dirname, '../apps/web/app/post/page.tsx');
        
        if (!fs.existsSync(pagePath)) {
            throw new Error('post/page.tsx not found');
        }

        const content = fs.readFileSync(pagePath, 'utf-8');
        
        if (!content.includes('useToast')) {
            throw new Error('useToast not imported or used');
        }

        if (!content.includes('useCreateListing')) {
            throw new Error('useCreateListing not used');
        }
    });

    test('Pages: edit/page uses ConfirmDialog', () => {
        const fs = require('fs');
        const path = require('path');
        const pagePath = path.join(__dirname, '../apps/web/app/listings/[id]/edit/page.tsx');
        
        if (!fs.existsSync(pagePath)) {
            throw new Error('edit/page.tsx not found');
        }

        const content = fs.readFileSync(pagePath, 'utf-8');
        
        if (!content.includes('ConfirmDialog')) {
            throw new Error('ConfirmDialog not imported or used');
        }

        if (content.includes('confirm(')) {
            throw new Error('confirm() still used, should be replaced with ConfirmDialog');
        }
    });

    test('Pages: page.tsx uses EmptyState and LoadingState', () => {
        const fs = require('fs');
        const path = require('path');
        const pagePath = path.join(__dirname, '../apps/web/app/page.tsx');
        
        if (!fs.existsSync(pagePath)) {
            throw new Error('page.tsx not found');
        }

        const content = fs.readFileSync(pagePath, 'utf-8');
        
        if (!content.includes('EmptyState') || !content.includes('LoadingState')) {
            throw new Error('EmptyState or LoadingState not imported or used');
        }
    });

    test('Pages: listings/[id]/page uses LoadingState and ErrorState', () => {
        const fs = require('fs');
        const path = require('path');
        const pagePath = path.join(__dirname, '../apps/web/app/listings/[id]/page.tsx');
        
        if (!fs.existsSync(pagePath)) {
            throw new Error('listings/[id]/page.tsx not found');
        }

        const content = fs.readFileSync(pagePath, 'utf-8');
        
        if (!content.includes('LoadingState')) {
            throw new Error('LoadingState not imported or used');
        }

        if (!content.includes('ErrorState')) {
            throw new Error('ErrorState not imported or used');
        }
    });
}

// ============================================================================
// 4. TRANSLATIONS TESTS
// ============================================================================

async function testTranslations() {
    console.log('\n🌐 Testing Translations...\n');

    test('Translations: UX state labels exist in French', () => {
        const fs = require('fs');
        const path = require('path');
        const translationsPath = path.join(__dirname, '../apps/web/lib/i18n/translations.ts');
        
        if (!fs.existsSync(translationsPath)) {
            throw new Error('translations.ts not found');
        }

        const content = fs.readFileSync(translationsPath, 'utf-8');
        
        const requiredKeys = [
            'noResults',
            'retry',
            'confirm',
            'listingCreated',
            'listingUpdated',
            'listingDeleted',
            'photoRemoved',
            'photosUploaded',
            'createFailed',
            'updateFailed',
            'deleteFailed',
            'loadFailed',
        ];

        for (const key of requiredKeys) {
            if (!content.includes(`${key}:`)) {
                throw new Error(`Translation key '${key}' not found in French`);
            }
        }
    });

    test('Translations: UX state labels exist in Arabic', () => {
        const fs = require('fs');
        const path = require('path');
        const translationsPath = path.join(__dirname, '../apps/web/lib/i18n/translations.ts');
        
        const content = fs.readFileSync(translationsPath, 'utf-8');
        
        // Check Arabic section
        const arabicSection = content.split('ar:')[1] || '';
        
        const arabicKeys = ['noResults', 'retry', 'confirm', 'listingCreated', 'listingDeleted'];
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
    console.log('🧪 Phase 2.3 Test Suite - Essential UX\n');
    console.log('='.repeat(60));

    // Run all test suites
    await testUIComponents();
    await testToastSystem();
    await testPageIntegration();
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

