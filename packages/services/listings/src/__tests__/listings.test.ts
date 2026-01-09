import { describe, it, expect, vi } from 'vitest';
import { CreateListingSchema, UpdateListingSchema } from '../index';

describe('Listings Service Regression Tests', () => {
    describe('CreateListingSchema', () => {
        it('should validate valid listing input', () => {
            const input = {
                title: 'Beautiful Apartment',
                op_type: 'rent',
                price: 15000,
                rooms: 3,
                surface: 120,
                lat: 18.0735,
                lng: -15.9582
            };
            const result = CreateListingSchema.safeParse(input);
            expect(result.success).toBe(true);
        });

        it('should require a title of at least 5 characters', () => {
            const result = CreateListingSchema.safeParse({
                title: 'No',
                price: 1000,
                lat: 0,
                lng: 0
            });
            expect(result.success).toBe(false);
        });

        it('should reject non-positive price', () => {
            const result = CreateListingSchema.safeParse({
                title: 'Valid Title',
                price: -1,
                lat: 0,
                lng: 0
            });
            expect(result.success).toBe(false);
        });

        it('should reject invalid coordinates', () => {
            expect(CreateListingSchema.safeParse({
                title: 'Valid Title',
                price: 1000,
                lat: 91,
                lng: 0
            }).success).toBe(false);

            expect(CreateListingSchema.safeParse({
                title: 'Valid Title',
                price: 1000,
                lat: 0,
                lng: 181
            }).success).toBe(false);
        });

        it('should enforce surface > 0 if provided', () => {
            const input = {
                title: 'Valid Title',
                price: 1000,
                lat: 0,
                lng: 0,
                surface: 0
            };
            const result = CreateListingSchema.safeParse(input);
            expect(result.success).toBe(false);
        });
    });

    describe('UpdateListingSchema', () => {
        it('should allow partial updates', () => {
            const result = UpdateListingSchema.safeParse({ title: 'New Title' });
            expect(result.success).toBe(true);
        });

        it('should require both lat and lng if one is provided', () => {
            expect(UpdateListingSchema.safeParse({ lat: 10 }).success).toBe(false);
            expect(UpdateListingSchema.safeParse({ lng: 10 }).success).toBe(false);
            expect(UpdateListingSchema.safeParse({ lat: 10, lng: 10 }).success).toBe(true);
        });

        it('should reject invalid status', () => {
            const result = UpdateListingSchema.safeParse({ status: 'invalid' });
            expect(result.success).toBe(false);
        });
    });
});
