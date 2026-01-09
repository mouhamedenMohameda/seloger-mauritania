import { describe, it, expect, vi } from 'vitest';
import {
    validateFileType,
    validateFileSize,
    validateFiles,
    validateFile,
    retryWithBackoff
} from '../file-validation';

describe('File Validation Utilities', () => {
    // Helper to create a mock File
    const createMockFile = (name: string, type: string, size: number): File => {
        return {
            name,
            type,
            size,
            lastModified: Date.now(),
            webkitRelativePath: '',
            arrayBuffer: async () => new ArrayBuffer(0),
            slice: () => new Blob(),
            stream: () => new ReadableStream(),
            text: async () => '',
        } as unknown as File;
    };

    describe('validateFileType', () => {
        it('should allow valid image types', () => {
            const file = createMockFile('test.jpg', 'image/jpeg', 100);
            expect(validateFileType(file).valid).toBe(true);
        });

        it('should reject invalid MIME types', () => {
            const file = createMockFile('test.pdf', 'application/pdf', 100);
            const result = validateFileType(file);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Type de fichier non autorisé');
        });

        it('should reject invalid extensions even if MIME type is valid', () => {
            const file = createMockFile('test.txt', 'image/jpeg', 100);
            const result = validateFileType(file);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Extension de fichier non autorisée');
        });
    });

    describe('validateFileSize', () => {
        it('should allow small files', () => {
            const file = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024); // 1MB
            expect(validateFileSize(file).valid).toBe(true);
        });

        it('should reject oversized files', () => {
            const file = createMockFile('test.jpg', 'image/jpeg', 10 * 1024 * 1024); // 10MB
            const result = validateFileSize(file);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('trop volumineux');
        });

        it('should reject empty files', () => {
            const file = createMockFile('test.jpg', 'image/jpeg', 0);
            const result = validateFileSize(file);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Le fichier est vide');
        });
    });

    describe('validateFiles', () => {
        it('should validate an array of files', () => {
            const files = [
                createMockFile('test1.jpg', 'image/jpeg', 1024),
                createMockFile('test2.png', 'image/png', 2048)
            ];
            expect(validateFiles(files).valid).toBe(true);
        });

        it('should reject if any file is invalid', () => {
            const files = [
                createMockFile('test1.jpg', 'image/jpeg', 1024),
                createMockFile('test2.pdf', 'application/pdf', 2048)
            ];
            expect(validateFiles(files).valid).toBe(false);
        });

        it('should reject if too many files', () => {
            const files = Array(11).fill(createMockFile('test.jpg', 'image/jpeg', 1024));
            const result = validateFiles(files);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Trop de fichiers');
        });
    });

    describe('retryWithBackoff', () => {
        it('should return result if first call succeeds', async () => {
            const fn = vi.fn().mockResolvedValue('success');
            const result = await retryWithBackoff(fn, 3, 10);
            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should retry on failure and eventually succeed', async () => {
            const fn = vi.fn()
                .mockRejectedValueOnce(new Error('fail'))
                .mockRejectedValueOnce(new Error('fail'))
                .mockResolvedValue('success');

            const result = await retryWithBackoff(fn, 3, 10);
            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(3);
        });

        it('should throw after max retries', async () => {
            const fn = vi.fn().mockRejectedValue(new Error('final fail'));
            await expect(retryWithBackoff(fn, 2, 10)).rejects.toThrow('final fail');
            expect(fn).toHaveBeenCalledTimes(3);
        });
    });

    describe('Additional Type Checks', () => {
        it('should allow webp format', () => {
            const file = createMockFile('image.webp', 'image/webp', 1000);
            expect(validateFileType(file).valid).toBe(true);
        });

        it('should handle uppercase extensions', () => {
            const file = createMockFile('IMAGE.JPG', 'image/jpeg', 1000);
            expect(validateFileType(file).valid).toBe(true);
        });

        it('should reject svg files', () => {
            const file = createMockFile('vector.svg', 'image/svg+xml', 1000);
            expect(validateFileType(file).valid).toBe(false);
        });

        it('should reject if filename has no extension', () => {
            const file = createMockFile('no-extension', 'image/jpeg', 1000);
            expect(validateFileType(file).valid).toBe(false);
        });

        it('should reject if filename ends with disallowed but contains allowed string', () => {
            const file = createMockFile('virus.jpg.exe', 'image/jpeg', 1000);
            expect(validateFileType(file).valid).toBe(false);
        });
    });

    describe('Additional Size Checks', () => {
        it('should handle exactly MAX_FILE_SIZE', () => {
            const file = createMockFile('large.jpg', 'image/jpeg', 5 * 1024 * 1024);
            expect(validateFileSize(file).valid).toBe(true);
        });

        it('should reject MAX_FILE_SIZE + 1 byte', () => {
            const file = createMockFile('too-large.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1);
            expect(validateFileSize(file).valid).toBe(false);
        });
    });

    describe('validateFile wrapper', () => {
        it('should call both type and size validation', () => {
            const file = createMockFile('test.jpg', 'image/jpeg', 1024);
            expect(validateFile(file).valid).toBe(true);
        });
    });
});
