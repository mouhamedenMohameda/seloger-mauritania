import { describe, it, expect, vi } from 'vitest';
import {
    searchNeighborhoods,
    getNeighborhoodByName,
    calculateDistance,
    reverseGeocode
} from '../geocoding';

describe('Geocoding Utilities', () => {
    describe('searchNeighborhoods', () => {
        it('should return empty array for short query', () => {
            expect(searchNeighborhoods('a')).toEqual([]);
        });

        it('should find neighborhood by name', () => {
            const results = searchNeighborhoods('Tevragh');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].name).toContain('Tevragh');
        });

        it('should be case insensitive', () => {
            const results = searchNeighborhoods('tevragh');
            expect(results.length).toBeGreaterThan(0);
        });

        it('should return empty array for non-matching query', () => {
            expect(searchNeighborhoods('NonExistentPlace')).toEqual([]);
        });
    });

    describe('getNeighborhoodByName', () => {
        it('should find exact neighborhood', () => {
            const result = getNeighborhoodByName('Arafat');
            expect(result).toBeDefined();
            expect(result?.name).toBe('Arafat');
        });

        it('should return undefined for non-match', () => {
            expect(getNeighborhoodByName('Unknown')).toBeUndefined();
        });
    });

    describe('calculateDistance', () => {
        it('should return 0 for same point', () => {
            expect(calculateDistance(18, -15, 18, -15)).toBe(0);
        });

        it('should calculate distance between two points', () => {
            // Nouakchott to somewhere nearby
            const dist = calculateDistance(18.0, -15.0, 18.1, -15.1);
            expect(dist).toBeGreaterThan(10);
            expect(dist).toBeLessThan(20);
        });
    });

    describe('reverseGeocode', () => {
        it('should handle successful response', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ display_name: 'Test Place', address: { road: 'Main St' } })
            });

            const result = await reverseGeocode(18, -15);
            expect(result?.display_name).toBe('Test Place');
            expect(result?.address.road).toBe('Main St');
        });

        it('should return null on fetch error', async () => {
            global.fetch = vi.fn().mockResolvedValue({ ok: false });
            const result = await reverseGeocode(18, -15);
            expect(result).toBeNull();
        });
    });
});
