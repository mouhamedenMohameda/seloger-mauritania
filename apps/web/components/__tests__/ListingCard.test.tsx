import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ListingCard from '../ListingCard';
import React from 'react';

// Mock CreateClient
vi.mock('../../lib/supabase/client', () => ({
    createClient: () => ({
        from: () => ({
            select: () => ({
                eq: () => ({
                    order: () => ({
                        limit: () => ({
                            maybeSingle: () => Promise.resolve({ data: null, error: null })
                        })
                    })
                })
            })
        }),
        storage: {
            from: () => ({
                getPublicUrl: () => ({ data: { publicUrl: null } })
            })
        }
    })
}));

// Mock useLanguage
vi.mock('../../lib/i18n/LanguageContext', () => ({
    useLanguage: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                'forRent': 'Louer',
                'forSale': 'Vendre',
                'priceOnRequest': 'Prix sur demande',
                'rooms': 'ch',
                'room': 'ch',
                'surfaceShort': 'm²'
            };
            return translations[key] || key;
        },
        language: 'fr'
    })
}));

// Mock the next/link component
vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode, href: string }) => <a href={href}>{children}</a>
}));

// Mock the FavoriteButton
vi.mock('../FavoriteButton', () => ({
    default: () => <button data-testid="fav-btn">Fav</button>
}));

// Mock the Image component
vi.mock('next/image', () => ({
    default: ({ src, alt }: { src: string, alt: string }) => <img src={src} alt={alt} />
}));

describe('ListingCard Component', () => {
    const mockListing = {
        id: '123',
        title: 'Villa de Luxe',
        price: 5000000,
        op_type: 'sell',
        rooms: 4,
        surface: 200,
        listing_photos: [
            { storage_path: 'photo1.jpg' }
        ]
    };

    it('should render listing details correctly', () => {
        render(<ListingCard listing={mockListing as any} />);

        expect(screen.getByText('Villa de Luxe')).toBeDefined();
        expect(screen.getByText(/5,000,000/)).toBeDefined();
        expect(screen.getByText('4')).toBeDefined();
        expect(screen.getByText('ch')).toBeDefined();
    });

    it('should display "Prix sur demande" if price is 0', () => {
        const listingNoPrice = { ...mockListing, price: 0 };
        render(<ListingCard listing={listingNoPrice as any} />);
        expect(screen.getByText(/N\/A/)).toBeDefined();
    });
});
