const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// ── Upload file and return both URL and public_id ─────────────────
export const uploadToCloudinary = async (file: File | Blob): Promise<string> => {
    const result = await uploadToCloudinaryWithId(file);
    return result.url;
};

export const uploadToCloudinaryWithId = async (
    file: File | Blob,
    folder = 'zerox_general'
): Promise<{ url: string; publicId: string; resourceType: 'image' | 'video' | 'raw' }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
        { method: 'POST', body: formData }
    );
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Upload failed');
    }
    const data = await response.json();
    return {
        url: data.secure_url as string,
        publicId: data.public_id as string,
        resourceType: data.resource_type as 'image' | 'video' | 'raw',
    };
};

// ── Upload a support chat media (images+videos → support_chat folder) ─
export const uploadSupportMedia = async (
    file: File
): Promise<{ url: string; publicId: string; mediaType: 'image' | 'video' }> => {
    const result = await uploadToCloudinaryWithId(file, 'zerox_support');
    const mediaType: 'image' | 'video' =
        result.resourceType === 'video' ? 'video' : 'image';
    return { url: result.url, publicId: result.publicId, mediaType };
};

// ── Delete a file from Cloudinary via unsigned destroy ────────────
// NOTE: Cloudinary's destroy endpoint requires a signed request (needs API Secret).
// We use our own Firebase Function proxy or simply mark public_ids for batch deletion.
// For the frontend, we store the public_id in Firestore and call this when resolving.
//
// Since direct unsigned deletion isn't supported by Cloudinary, we POST to the
// Cloudinary invalidate endpoint (which works with unsigned presets in some configs).
// For production, replace with a Firebase Cloud Function that signs the request.
export const deleteFromCloudinary = async (
    publicId: string,
    resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<void> => {
    try {
        // Attempt via Cloudinary unsigned destroy (only works if preset allows it)
        const formData = new FormData();
        formData.append('public_id', publicId);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/destroy`,
            { method: 'POST', body: formData }
        );
    } catch (err) {
        // Log but don't throw — chat resolve should succeed regardless
        console.warn('Cloudinary delete attempted (may require backend signing):', publicId, err);
    }
};
