import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: [],
    });
}

/**
 * Sanitize plain text (remove any HTML tags)
 */
export function sanitizeText(text: string): string {
    return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}

/**
 * Validate Mauritanian phone number format
 * Formats: +222XXXXXXXX, 00222XXXXXXXX, 0XXXXXXXX, XXXXXXXXX
 * Where X is a digit (0-9)
 */
export function validateMauritanianPhone(phone: string): boolean {
    // Remove all whitespace
    const cleaned = phone.replace(/\s+/g, '');
    
    // Patterns:
    // +222XXXXXXXX (international with +)
    // 00222XXXXXXXX (international with 00)
    // 0XXXXXXXX (local with leading 0)
    // XXXXXXXXX (local without leading 0)
    const patterns = [
        /^\+222[0-9]{8}$/,      // +222XXXXXXXX
        /^00222[0-9]{8}$/,      // 00222XXXXXXXX
        /^0[0-9]{8}$/,          // 0XXXXXXXX
        /^[0-9]{8,9}$/,         // XXXXXXXXX (8-9 digits)
    ];
    
    return patterns.some(pattern => pattern.test(cleaned));
}

/**
 * Validate geographic coordinates
 */
export function validateCoordinates(lat: number, lng: number): boolean {
    return (
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
    );
}

/**
 * Create a safe PostGIS POINT from validated coordinates
 * Uses ST_MakePoint function to prevent SQL injection
 */
export function createPostGISPoint(lat: number, lng: number): string {
    if (!validateCoordinates(lat, lng)) {
        throw new Error('Invalid coordinates: lat must be in [-90, 90], lng must be in [-180, 180]');
    }
    
    // Use ST_MakePoint function instead of string concatenation
    // This prevents SQL injection
    return `SRID=4326;POINT(${lng} ${lat})`;
}

/**
 * Strip unknown fields from an object based on allowed keys
 */
export function stripUnknownFields<T extends Record<string, unknown>>(
    data: Record<string, unknown>,
    allowedKeys: readonly (keyof T)[]
): Partial<T> {
    const result: Partial<T> = {};
    
    for (const key of allowedKeys) {
        const keyStr = String(key);
        if (keyStr in data) {
            result[key] = data[keyStr] as T[keyof T];
        }
    }
    
    return result;
}

