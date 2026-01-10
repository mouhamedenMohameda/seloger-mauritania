'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import MobileMenu from './MobileMenu';

interface NavBarClientProps {
    user: { id: string; email: string } | null;
}

export default function NavBarClient({ user }: NavBarClientProps) {
    const { t } = useLanguage();
    const pathname = usePathname();

    const NavLink = ({ href, children, active }: { href: string; children: React.ReactNode; active: boolean }) => (
        <Link
            href={href}
            className={`text-sm font-bold transition-all hover:text-primary relative py-1 group ${active ? 'text-primary' : 'text-gray-500'
                }`}
        >
            {children}
            <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-primary transition-all duration-300 origin-left ${active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'
                }`} />
        </Link>
    );

    return (
        <div className="flex items-center gap-3 md:gap-4">
            {/* Language Switcher (Hidden on mobile, included in MobileMenu) */}
            <div className="hidden md:block">
                <LanguageSwitcher />
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6">
                <Link
                    href="/post"
                    className="rounded-full bg-primary px-6 py-2 text-sm font-bold text-white shadow-md hover:bg-primary/90 hover:scale-105 transition-all active:scale-95"
                >
                    {t('postAd')}
                </Link>
                {user ? (
                    <div className="flex items-center gap-6">
                        <NavLink href="/favorites" active={pathname === '/favorites'}>{t('favorites') || 'Favoris'}</NavLink>
                        <NavLink href="/my-listings" active={pathname === '/my-listings'}>{t('myListings')}</NavLink>
                        <NavLink href="/account" active={pathname === '/account'}>{t('account')}</NavLink>
                    </div>
                ) : (
                    <NavLink href="/login" active={pathname === '/login'}>{t('login')}</NavLink>
                )}
            </div>

            {/* Mobile Menu */}
            <MobileMenu user={user} />
        </div>
    );
}

