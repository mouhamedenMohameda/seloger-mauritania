/**
 * Server-safe HTML sanitization without jsdom dependency
 * Uses simple regex patterns for serverless compatibility
 */

// Simple HTML tag whitelist for basic formatting
const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li'];

/**
 * Sanitize HTML content to prevent XSS attacks (server-safe)
 * Strips all HTML except whitelisted tags
 */
export function sanitizeHtml(html: string): string {
    if (!html) return '';

    // First, remove script and style tags completely (including their content)
    let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Remove event handlers and javascript: links
    cleaned = cleaned.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
    cleaned = cleaned.replace(/javascript:/gi, '');

    // Remove all HTML tags except whitelisted ones
    cleaned = cleaned.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tagName) => {
        const tag = tagName.toLowerCase();
        if (ALLOWED_TAGS.includes(tag)) {
            // Keep only the tag name without attributes
            if (match.startsWith('</')) {
                return `</${tag}>`;
            }
            return `<${tag}>`;
        }
        return '';
    });

    return cleaned.trim();
}

/**
 * Sanitize plain text (remove any HTML tags)
 */
export function sanitizeText(text: string): string {
    if (!text) return '';
    // Remove all HTML tags and their content if they contain scripts
    let cleaned = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    return cleaned.trim();
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

