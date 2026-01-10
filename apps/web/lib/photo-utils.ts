/**
 * Utility functions for handling photos
 * Supports both Supabase Storage paths and external URLs (S3, etc.)
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Check if a storage_path is an external URL (http:// or https://)
 */
export function isExternalUrl(path: string): boolean {
    return path.startsWith('http://') || path.startsWith('https://');
}

/**
 * Get photo URL from storage_path
 * Returns external URL directly if it's an external URL
 * Otherwise gets the public URL from Supabase Storage
 */
export function getPhotoUrl(
    supabase: SupabaseClient,
    storagePath: string
): string {
    // If it's an external URL (S3, etc.), return it directly
    if (isExternalUrl(storagePath)) {
        return storagePath;
    }

    // Otherwise, get public URL from Supabase Storage
    const { data } = supabase.storage.from('listings').getPublicUrl(storagePath);
    return data.publicUrl;
}

/**
 * Get multiple photo URLs from storage paths
 */
export function getPhotoUrls(
    supabase: SupabaseClient,
    storagePaths: string[]
): string[] {
    return storagePaths
        .filter(path => path && path.trim() !== '')
        .map(path => getPhotoUrl(supabase, path.trim()));
}
