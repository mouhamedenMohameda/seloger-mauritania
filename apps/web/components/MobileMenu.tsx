'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

interface MobileMenuProps {
    user: { id: string; email: string } | null;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export default function MobileMenu({ user, isOpen: controlledIsOpen, onOpenChange }: MobileMenuProps) {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

    const setIsOpen = (value: boolean) => {
        if (onOpenChange) {
            onOpenChange(value);
        } else {
            setInternalIsOpen(value);
        }
    };
    const router = useRouter();
    const menuRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);
    const { t, lang } = useLanguage();

    // Ensure component is mounted before using portal (only on client)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setMounted(true);
        }
    }, []);

    // Lock scroll when menu is open (only on client)
    useEffect(() => {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;
        
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            if (typeof document !== 'undefined') {
                document.body.style.overflow = 'unset';
            }
        };
    }, [isOpen]);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        setIsOpen(false);
        router.push('/');
        router.refresh();
    };

    // Menu overlay content - rendered via portal to body (only on client)
    // Don't create menuOverlay at all during SSR to avoid any issues
    const menuOverlay = (mounted && typeof window !== 'undefined' && typeof document !== 'undefined') ? (
        <div
            className={`fixed inset-0 transition-all duration-300 ${isOpen ? 'visible opacity-100 pointer-events-auto' : 'invisible opacity-0 pointer-events-none'}`}
            style={{ zIndex: 9999, position: 'fixed' }}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
                onClick={() => setIsOpen(false)}
                style={{ zIndex: 10000 }}
            />

            {/* Menu Panel */}
            <div 
                className={`absolute top-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col ltr:right-0 rtl:left-0 ${isOpen
                    ? 'translate-x-0'
                    : 'ltr:translate-x-full rtl:-translate-x-full'
                    }`}
                style={{ zIndex: 10001 }}
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2.5 rounded-xl hover:bg-gray-200 text-gray-900 bg-gray-100 transition-colors shadow-sm active:scale-90"
                            aria-label="Close menu"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <Image
                            src="/logo.png"
                            alt="raDar"
                            width={100}
                            height={32}
                            className="h-7 w-auto object-contain"
                        />
                    </div>

                    {/* Language Switcher inside menu */}
                    <div className="scale-90 origin-right rtl:origin-left">
                        <LanguageSwitcher />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-6 px-4">
                    <div className="space-y-4">
                        <Link
                            href="/post"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 w-full px-4 py-3.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-lg active:scale-95 text-center justify-center mb-6"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            {t('postAd')}
                        </Link>

                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 mb-2">
                                {t('navigation')}
                            </p>
                            {user ? (
                                <>
                                    <Link
                                        href="/favorites"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-4 px-4 py-4 text-base font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all rounded-2xl group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                            </svg>
                                        </div>
                                        {t('favorites') || 'Favoris'}
                                    </Link>
                                    <Link
                                        href="/my-listings"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-4 px-4 py-4 text-base font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all rounded-2xl group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        </div>
                                        {t('myListings')}
                                    </Link>
                                    <Link
                                        href="/account"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-4 px-4 py-4 text-base font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all rounded-2xl group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        {t('account')}
                                    </Link>
                                </>
                            ) : (
                                <Link
                                    href="/login"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-4 px-4 py-4 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-all rounded-2xl group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-gray-200 transition-colors">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                        </svg>
                                    </div>
                                    {t('login')}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {user && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50/30">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-4 w-full px-4 py-4 text-base font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-all rounded-2xl group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 group-hover:bg-red-100 transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </div>
                            {t('signOut')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    ) : null;

    return (
        <>
            <div className="mobile-menu-wrapper" ref={menuRef}>
                {/* Hamburger Button - stays in NavBar */}
                <button
                    onClick={() => setIsOpen(true)}
                    className="p-2 rounded-xl text-gray-700 hover:bg-gray-100 focus:outline-none transition-colors relative"
                    aria-label="Open menu"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>
            
            {/* Render menu overlay via portal directly to body - ensures it's above everything including map */}
            {/* Only render portal on client side (after mount and when document.body exists) */}
            {(() => {
                if (!mounted || typeof window === 'undefined' || typeof document === 'undefined' || !menuOverlay || !document.body) {
                    return null;
                }
                try {
                    return createPortal(menuOverlay, document.body);
                } catch (error) {
                    console.error('Error creating portal for mobile menu:', error);
                    return null;
                }
            })()}
        </>
    );
}

