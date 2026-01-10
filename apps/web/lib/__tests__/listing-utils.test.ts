import { describe, it, expect } from 'vitest';
import { cleanListingTitle, formatPrice } from '../listing-utils';

describe('Listing Utilities', () => {
    describe('cleanListingTitle', () => {
        it('should return placeholder for null or undefined', () => {
            expect(cleanListingTitle(null, 'Untitled')).toBe('Untitled');
            expect(cleanListingTitle(undefined, 'Untitled')).toBe('Untitled');
            expect(cleanListingTitle('', 'Untitled')).toBe('Untitled');
        });

        it('should preserve valid Arabic text', () => {
            const title = 'شقة للبيع في تفرغ زينة';
            expect(cleanListingTitle(title)).toBe(title);
        });

        it('should preserve valid French text', () => {
            const title = 'Appartement à vendre à Tevragh Zeina';
            expect(cleanListingTitle(title)).toBe(title);
        });

        it('should remove repeated price patterns at the start', () => {
            const title = '200,000 MRU 200,000 MRU Belle Maison';
            expect(cleanListingTitle(title)).toBe('Belle Maison');
        });

        it('should remove pagination artifacts', () => {
            const title = 'Villa de luxe 1 / 15';
            expect(cleanListingTitle(title)).toBe('Villa de luxe');
        });

        it('should handle aggressive cleaning for non-text titles', () => {
            const title = '1500000 MRU 1500000 MRU 1500000 MRU';
            expect(cleanListingTitle(title, 'En attente')).toBe('En attente');
        });

        it('should normalize whitespace', () => {
            const title = '   Appartement   spacieux   ';
            expect(cleanListingTitle(title)).toBe('Appartement spacieux');
        });

        it('should fallback to original if cleaning removes too much but text was valid', () => {
            const title = 'Ok'; // Too short (< 3)
            expect(cleanListingTitle(title, 'Empty')).toBe('Empty');
        });
    });

    describe('formatPrice', () => {
        it('should format numbers correctly', () => {
            expect(formatPrice(1000000)).toBe('1,000,000');
            expect(formatPrice(500)).toBe('500');
        });

        it('should handle strings with non-numeric characters', () => {
            expect(formatPrice('1.000.000 MRU')).toBe('1,000,000');
            expect(formatPrice('Price: 500')).toBe('500');
        });

        it('should return N/A for invalid inputs', () => {
            expect(formatPrice(null)).toBe('N/A');
            expect(formatPrice(undefined)).toBe('N/A');
            expect(formatPrice('Not a number')).toBe('N/A');
        });
    });
});
