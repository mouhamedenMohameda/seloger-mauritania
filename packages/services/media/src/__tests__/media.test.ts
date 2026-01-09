import { describe, it, expect, vi } from 'vitest';
import { createPresignedUploadUrl, commitPhoto, deletePhoto } from '../index';

describe('Media Service Regression Tests', () => {
    const mockClient = {
        from: vi.fn(() => mockClient),
        insert: vi.fn(() => mockClient),
        delete: vi.fn(() => mockClient),
        eq: vi.fn(() => mockClient),
        select: vi.fn(() => mockClient),
        single: vi.fn(),
        storage: {
            from: vi.fn(() => ({
                createSignedUploadUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'url', token: 'token' }, error: null })
            }))
        }
    };

    it('createPresignedUploadUrl should call storage methods', async () => {
        const res = await createPresignedUploadUrl(mockClient as any, 'listing-1', 'user-1', 'test.jpg');

        expect(mockClient.storage.from).toHaveBeenCalledWith('listings');
        expect(res.data?.signedUrl).toBe('url');
        expect(res.data?.path).toBe('user-1/listing-1/test.jpg');
    });

    it('commitPhoto should insert into listing_photos', async () => {
        await commitPhoto(mockClient as any, 'listing-1', 'path/to/photo');

        expect(mockClient.from).toHaveBeenCalledWith('listing_photos');
        expect(mockClient.insert).toHaveBeenCalledWith({
            listing_id: 'listing-1',
            storage_path: 'path/to/photo'
        });
        expect(mockClient.single).toHaveBeenCalled();
    });

    it('deletePhoto should call delete on listing_photos', async () => {
        await deletePhoto(mockClient as any, 'photo-123');

        expect(mockClient.from).toHaveBeenCalledWith('listing_photos');
        expect(mockClient.delete).toHaveBeenCalled();
        expect(mockClient.eq).toHaveBeenCalledWith('id', 'photo-123');
    });
});
