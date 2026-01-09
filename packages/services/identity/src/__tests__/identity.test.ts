import { describe, it, expect, vi } from 'vitest';
import { getProfile, updateProfile } from '../index';

describe('Identity Service Regression Tests', () => {
    const mockClient = {
        from: vi.fn(() => mockClient),
        select: vi.fn(() => mockClient),
        update: vi.fn(() => mockClient),
        eq: vi.fn(() => mockClient),
        single: vi.fn()
    };

    it('getProfile should call correct supabase methods', async () => {
        const userId = 'user-123';
        await getProfile(mockClient as any, userId);

        expect(mockClient.from).toHaveBeenCalledWith('profiles');
        expect(mockClient.select).toHaveBeenCalledWith('*');
        expect(mockClient.eq).toHaveBeenCalledWith('id', userId);
        expect(mockClient.single).toHaveBeenCalled();
    });

    it('updateProfile should call correct supabase methods', async () => {
        const userId = 'user-123';
        const updates = { full_name: 'New Name' };

        await updateProfile(mockClient as any, userId, updates);

        expect(mockClient.from).toHaveBeenCalledWith('profiles');
        expect(mockClient.update).toHaveBeenCalledWith(updates);
        expect(mockClient.eq).toHaveBeenCalledWith('id', userId);
        expect(mockClient.single).toHaveBeenCalled();
    });
});
