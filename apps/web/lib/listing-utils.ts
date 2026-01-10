/**
 * Normalizes and cleans listing titles by removing common artifacts like repeated prices,
 * pagination strings, and unnecessary whitespace, while preserving valid Arabic and Latin text.
 */
export function cleanListingTitle(title: string | null | undefined, untitledPlaceholder: string = '无标题'): string {
    if (!title || typeof title !== 'string' || !title.trim()) {
        return untitledPlaceholder;
    }

    let cleaned = title.trim();

    // Identify if the title contains valid text content (Arabic or Latin)
    const hasArabicText = /[\u0600-\u06FF]/.test(cleaned);
    const hasLatinText = /[A-Za-zÀ-ÿ]/.test(cleaned);

    if (hasArabicText || hasLatinText) {
        // Only remove obvious duplicate price patterns at the start
        cleaned = cleaned
            .replace(/^(\d[\d\s,]*\s*MRU\s*){2,}/gi, '') // Remove repeated leading "prix MRU"
            .replace(/\d+\s*\/\s*\d+/g, '') // Remove pagination like "1 / 3"
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
    } else {
        // If title is just numbers/prices with no text, clean more aggressively
        cleaned = cleaned
            .replace(/(\d[\d\s]*\s*MRU\s*){2,}/gi, '')
            .replace(/\d+\s*\/\s*\d+/g, '')
            .replace(/^\d[\d\s]*\s*MRU\s*/gi, '')
            .replace(/\d+[\s,]*\d+[\s,]*\d+[\s,]*MRU/gi, '')
            .replace(/^[\d\s,]+(MRU|MRO)?\s*/i, '')
            .replace(/[\d\s,]+(MRU|MRO)\s*$/i, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Final sanity check: if it's too short or just numbers/symbols, fallback
    const isJustNumbers = cleaned.match(/^[\d\s,.\-MRU]*$/i);
    if (isJustNumbers || cleaned.length < 3) {
        // If the original title was better than nothing, keep it, otherwise use placeholder
        if (title.trim().length >= 3 && (hasArabicText || /[A-Za-z]/.test(title.replace(/MRU/gi, '')))) {
            return title.trim();
        }
        return untitledPlaceholder;
    }

    return cleaned;
}

/**
 * Formats a price into a readable string with currency MRU.
 */
export function formatPrice(price: number | string | null | undefined): string {
    if (price === null || price === undefined || price === '') return 'N/A';

    if (typeof price === 'string') {
        // Mauritanian context: dots are often thousands separators. 
        // If multiple dots exist, remove them all.
        let sanitized = price.replace(/MRU/gi, '').trim();
        const dotCount = (sanitized.match(/\./g) || []).length;
        if (dotCount > 1 || (dotCount === 1 && sanitized.length > 4)) {
            sanitized = sanitized.replace(/\./g, '');
        }
        // Remove everything except digits and decimal point
        const numPrice = parseFloat(sanitized.replace(/[^\d.-]/g, ''));
        return isNaN(numPrice) ? 'N/A' : numPrice.toLocaleString();
    }

    return price.toLocaleString();
}
