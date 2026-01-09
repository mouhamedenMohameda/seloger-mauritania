/**
 * File validation utilities for uploads
 */

export interface FileValidationResult {
    valid: boolean;
    error?: string;
}

// Allowed MIME types for images
const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

// Maximum number of files
const MAX_FILES = 10;

/**
 * Validate file type
 */
export function validateFileType(file: File): FileValidationResult {
    // Check MIME type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: `Type de fichier non autorisé. Types acceptés: JPEG, PNG, WEBP`,
        };
    }

    // Check file extension as additional validation
    const fileName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
        return {
            valid: false,
            error: `Extension de fichier non autorisée. Extensions acceptées: .jpg, .jpeg, .png, .webp`,
        };
    }

    return { valid: true };
}

/**
 * Validate file size
 */
export function validateFileSize(file: File): FileValidationResult {
    if (file.size > MAX_FILE_SIZE) {
        const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
        return {
            valid: false,
            error: `Fichier trop volumineux. Taille maximale: ${maxSizeMB}MB`,
        };
    }

    if (file.size === 0) {
        return {
            valid: false,
            error: 'Le fichier est vide',
        };
    }

    return { valid: true };
}

/**
 * Validate multiple files
 */
export function validateFiles(files: File[]): FileValidationResult {
    if (files.length === 0) {
        return { valid: true }; // No files is valid (optional)
    }

    if (files.length > MAX_FILES) {
        return {
            valid: false,
            error: `Trop de fichiers. Maximum: ${MAX_FILES} fichiers`,
        };
    }

    // Validate each file
    for (const file of files) {
        const typeCheck = validateFileType(file);
        if (!typeCheck.valid) {
            return typeCheck;
        }

        const sizeCheck = validateFileSize(file);
        if (!sizeCheck.valid) {
            return sizeCheck;
        }
    }

    return { valid: true };
}

/**
 * Validate a single file
 */
export function validateFile(file: File): FileValidationResult {
    const typeCheck = validateFileType(file);
    if (!typeCheck.valid) {
        return typeCheck;
    }

    const sizeCheck = validateFileSize(file);
    if (!sizeCheck.valid) {
        return sizeCheck;
    }

    return { valid: true };
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
): Promise<T> {
    let lastError: Error | unknown;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            // Don't retry on the last attempt
            if (attempt === maxRetries) {
                throw error;
            }
            
            // Exponential backoff: delay = initialDelay * 2^attempt
            const delay = initialDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
}

export const FILE_CONSTANTS = {
    MAX_FILE_SIZE,
    MAX_FILES,
    ALLOWED_IMAGE_TYPES,
    ALLOWED_EXTENSIONS,
} as const;

