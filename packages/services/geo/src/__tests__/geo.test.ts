import { describe, it, expect } from 'vitest';
import { SearchFiltersSchema, RadiusSearchSchema } from '../index';

describe('Geo Service Schemas', () => {
    describe('SearchFiltersSchema', () => {
        it('should validate complete set of filters', () => {
            const validData = {
                minLng: -16.0,
                minLat: 18.0,
                maxLng: -15.0,
                maxLat: 19.0,
                q: 'appartement',
                minPrice: 1000,
                maxPrice: 5000,
                minRooms: 2,
                maxRooms: 5,
                minSurface: 50,
                maxSurface: 200,
                opType: 'rent',
                sortBy: 'price_asc',
                limit: 20,
                offset: 0
            };
            const result = SearchFiltersSchema.safeParse(validData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.q).toBe('appartement');
            }
        });

        it('should use default values for limit, offset and sortBy', () => {
            const minimalData = {
                minLng: -16.0,
                minLat: 18.0,
                maxLng: -15.0,
                maxLat: 19.0
            };
            const result = SearchFiltersSchema.safeParse(minimalData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.limit).toBe(50);
                expect(result.data.offset).toBe(0);
                expect(result.data.sortBy).toBe('date_desc');
            }
        });

        it('should fail with missing coordinates', () => {
            const invalidData = {
                minLng: -16.0
            };
            const result = SearchFiltersSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should coerce string values to numbers', () => {
            const stringData = {
                minLng: '-16.0',
                minLat: '18.0',
                maxLng: '-15.0',
                maxLat: '19.0',
                minPrice: '1000'
            };
            const result = SearchFiltersSchema.safeParse(stringData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(typeof result.data.minPrice).toBe('number');
                expect(result.data.minPrice).toBe(1000);
            }
        });
    });

    describe('RadiusSearchSchema', () => {
        it('should validate correct radius search params', () => {
            const validData = {
                centerLat: 18.0735,
                centerLng: -15.9582,
                radiusKm: 10,
                q: 'maison'
            };
            const result = RadiusSearchSchema.safeParse(validData);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.radiusKm).toBe(10);
                expect(result.data.q).toBe('maison');
            }
        });

        it('should fail with invalid latitude', () => {
            const invalidData = {
                centerLat: 95,
                centerLng: -15.9582,
                radiusKm: 10
            };
            const result = RadiusSearchSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should fail with negative radius', () => {
            const invalidData = {
                centerLat: 18,
                centerLng: -15,
                radiusKm: -1
            };
            const result = RadiusSearchSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should handle missing centerLng', () => {
            const result = RadiusSearchSchema.safeParse({ centerLat: 18, radiusKm: 1 });
            expect(result.success).toBe(false);
        });
    });

    describe('Enum and Sort Validation', () => {
        it('should accept all valid sort orders', () => {
            const sorts = ['price_asc', 'price_desc', 'date_desc', 'date_asc', 'surface_desc', 'surface_asc'];
            sorts.forEach(sortBy => {
                const res = SearchFiltersSchema.safeParse({
                    minLng: 0, minLat: 0, maxLng: 1, maxLat: 1, sortBy
                });
                expect(res.success).toBe(true);
            });
        });

        it('should reject invalid sort order', () => {
            const res = SearchFiltersSchema.safeParse({
                minLng: 0, minLat: 0, maxLng: 1, maxLat: 1, sortBy: 'invalid'
            });
            expect(res.success).toBe(false);
        });

        it('should accept valid opType', () => {
            expect(SearchFiltersSchema.safeParse({
                minLng: 0, minLat: 0, maxLng: 1, maxLat: 1, opType: 'rent'
            }).success).toBe(true);
            expect(SearchFiltersSchema.safeParse({
                minLng: 0, minLat: 0, maxLng: 1, maxLat: 1, opType: 'sell'
            }).success).toBe(true);
        });

        it('should reject invalid opType', () => {
            expect(SearchFiltersSchema.safeParse({
                minLng: 0, minLat: 0, maxLng: 1, maxLat: 1, opType: 'both'
            }).success).toBe(false);
        });
    });

    describe('Numeric Range Validation (Coercion)', () => {
        it('should handle zero values correctly', () => {
            const res = SearchFiltersSchema.safeParse({
                minLng: 0, minLat: 0, maxLng: 0, maxLat: 0, minPrice: 0
            });
            expect(res.success).toBe(true);
            if (res.success) expect(res.data.minPrice).toBe(0);
        });

        it('should reject non-numeric strings that cannot be coerced', () => {
            const res = SearchFiltersSchema.safeParse({
                minLng: 'abc', minLat: 0, maxLng: 1, maxLat: 1
            });
            expect(res.success).toBe(false);
        });
    });

    describe('Schema Metadata', () => {
        it('should enforce maximum limit of 100', () => {
            const res = SearchFiltersSchema.safeParse({
                minLng: 0, minLat: 0, maxLng: 1, maxLat: 1, limit: 101
            });
            expect(res.success).toBe(false);
        });

        it('should allow limit of 100', () => {
            const res = SearchFiltersSchema.safeParse({
                minLng: 0, minLat: 0, maxLng: 1, maxLat: 1, limit: 100
            });
            expect(res.success).toBe(true);
        });
    });

    describe('Additional Geo Validations', () => {
        it('should reject invalid longitude range (181)', () => {
            const res = RadiusSearchSchema.safeParse({ centerLat: 0, centerLng: 181, radiusKm: 1 });
            expect(res.success).toBe(false);
        });

        it('should reject invalid longitude range (-181)', () => {
            const res = RadiusSearchSchema.safeParse({ centerLat: 0, centerLng: -181, radiusKm: 1 });
            expect(res.success).toBe(false);
        });

        it('should reject non-integer limit', () => {
            const res = SearchFiltersSchema.safeParse({
                minLng: 0, minLat: 0, maxLng: 1, maxLat: 1, limit: 10.5
            });
            expect(res.success).toBe(false);
        });

        it('should reject negative offset', () => {
            const res = SearchFiltersSchema.safeParse({
                minLng: 0, minLat: 0, maxLng: 1, maxLat: 1, offset: -1
            });
            expect(res.success).toBe(false);
        });
    });
});
