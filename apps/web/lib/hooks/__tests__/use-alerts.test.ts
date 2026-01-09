import { describe, it, expect } from 'vitest';
import { CreateAlertSchema } from '../use-alerts';

describe('Alerts Hook Regression Tests', () => {
    describe('CreateAlertSchema', () => {
        it('should validate valid alert input', () => {
            const result = CreateAlertSchema.safeParse({
                name: 'My Search',
                minPrice: 1000,
                maxPrice: 5000,
                opType: 'rent',
                radiusKm: 10
            });
            expect(result.success).toBe(true);
        });

        it('should require a name', () => {
            const result = CreateAlertSchema.safeParse({ minPrice: 1000 });
            expect(result.success).toBe(false);
        });

        it('should enforce radiusKm limit (max 50)', () => {
            const result = CreateAlertSchema.safeParse({
                name: 'Test',
                radiusKm: 51
            });
            expect(result.success).toBe(false);
        });

        it('should allow valid coordinate pairs', () => {
            const result = CreateAlertSchema.safeParse({
                name: 'Test',
                centerLat: 18,
                centerLng: -15
            });
            expect(result.success).toBe(true);
        });

        it('should reject invalid coordinates', () => {
            expect(CreateAlertSchema.safeParse({ name: 'T', centerLat: 91 }).success).toBe(false);
            expect(CreateAlertSchema.safeParse({ name: 'T', centerLng: 181 }).success).toBe(false);
        });
    });
});
