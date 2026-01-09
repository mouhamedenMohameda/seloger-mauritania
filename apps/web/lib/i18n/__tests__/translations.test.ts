import { describe, it, expect } from 'vitest';
import { translations } from '../translations';

describe('I18n Translations', () => {
    it('should have french translations', () => {
        expect(translations.fr).toBeDefined();
    });

    it('should have arabic translations', () => {
        expect(translations.ar).toBeDefined();
    });

    it('should have the same keys for fr and ar', () => {
        const frKeys = Object.keys(translations.fr).sort();
        const arKeys = Object.keys(translations.ar).sort();
        expect(frKeys).toEqual(arKeys);
    });

    it('should contain the new app name raDar', () => {
        expect(translations.fr.moveMapToFind).toContain('raDar');
        expect(translations.ar.moveMapToFind).toContain('raDar');
    });

    describe('French Content', () => {
        it('should have non-empty search placeholder', () => {
            expect(translations.fr.searchPlaceholder.length).toBeGreaterThan(0);
        });

        it('should have correct navigation labels', () => {
            expect(typeof translations.fr.allListings).toBe('string');
            expect(typeof translations.fr.postAd).toBe('string');
        });

        it('should have mru currency', () => {
            expect(translations.fr.mru).toBe('MRU');
        });

        it('should have forRent/forSale types', () => {
            expect(translations.fr.forRent).toBeDefined();
            expect(translations.fr.forSale).toBeDefined();
        });

        it('should have filter labels', () => {
            expect(translations.fr.filters).toBeDefined();
            expect(translations.fr.price).toBeDefined();
        });
    });

    describe('Arabic Content', () => {
        it('should have non-empty search placeholder in Arabic', () => {
            expect(translations.ar.searchPlaceholder).toContain('raDar');
        });

        it('should have mru currency in Arabic', () => {
            expect(translations.ar.mru).toBe('أوقية');
        });

        it('should have forRent/forSale types in Arabic', () => {
            expect(translations.ar.forRent).toBeDefined();
            expect(translations.ar.forSale).toBeDefined();
        });

        it('should have room/surface labels', () => {
            expect(translations.ar.rooms).toBeDefined();
            expect(translations.ar.surface).toBeDefined();
        });

        it('should have sorting labels', () => {
            expect(translations.ar.sortBy).toBeDefined();
            expect(translations.ar.priceLowToHigh).toBeDefined();
        });
    });

    describe('Required Keys Coverage', () => {
        const requiredKeys = [
            'searchPlaceholder', 'moveMapToFind', 'noListingsYet',
            'viewMap', 'viewList', 'filters', 'sortBy', 'price',
            'rooms', 'surface', 'forRent', 'forSale', 'mru'
        ];

        requiredKeys.forEach(key => {
            it(`should have key: ${key}`, () => {
                expect(translations.fr[key as keyof typeof translations.fr]).toBeDefined();
                expect(translations.ar[key as keyof typeof translations.ar]).toBeDefined();
            });
        });
    });
});
