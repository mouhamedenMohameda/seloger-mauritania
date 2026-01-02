import { SupabaseClient } from '@supabase/supabase-js';

export async function createPresignedUploadUrl(
    client: SupabaseClient,
    listingId: string,
    userId: string,
    fileName: string
) {
    const filePath = `${userId}/${listingId}/${fileName}`;
    // Use createSignedUploadUrl for uploads (not createSignedUrl which is for downloads)
    const { data, error } = await client.storage
        .from('listings')
        .createSignedUploadUrl(filePath);
    
    if (error) {
        return { data: null, error };
    }
    
    return {
        data: {
            signedUrl: data.signedUrl,
            path: filePath,
            token: data.token
        },
        error: null
    };
}

export async function commitPhoto(
    client: SupabaseClient,
    listingId: string,
    storagePath: string
) {
    return client
        .from('listing_photos')
        .insert({
            listing_id: listingId,
            storage_path: storagePath
        })
        .select()
        .single();
}

export async function deletePhoto(
    client: SupabaseClient,
    photoId: string
) {
    return client
        .from('listing_photos')
        .delete()
        .eq('id', photoId);
}
