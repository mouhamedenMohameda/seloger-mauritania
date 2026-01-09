import { describe, it, expect } from 'vitest';
import { CreateReportSchema } from '../index';

describe('Moderation Service Regression Tests', () => {
    describe('CreateReportSchema', () => {
        it('should validate valid report', () => {
            const input = {
                listingId: '550e8400-e29b-41d4-a716-446655440000',
                reason: 'This listing is fraudulent and contains fake photos.'
            };
            const result = CreateReportSchema.safeParse(input);
            expect(result.success).toBe(true);
        });

        it('should reject invalid listingId (not uuid)', () => {
            const input = {
                listingId: 'invalid-uuid',
                reason: 'Reason is long enough'
            };
            const result = CreateReportSchema.safeParse(input);
            expect(result.success).toBe(false);
        });

        it('should reject short reason', () => {
            const input = {
                listingId: '550e8400-e29b-41d4-a716-446655440000',
                reason: 'Too short'
            };
            const result = CreateReportSchema.safeParse(input);
            expect(result.success).toBe(false);
        });

        it('should reject very long reason', () => {
            const input = {
                listingId: '550e8400-e29b-41d4-a716-446655440000',
                reason: 'a'.repeat(501)
            };
            const result = CreateReportSchema.safeParse(input);
            expect(result.success).toBe(false);
        });
    });
});
