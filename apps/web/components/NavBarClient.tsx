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

    return (
        <div className="flex items-center gap-3 md:gap-4">
            {/* Language Switcher (Hidden on mobile, included in MobileMenu) */}
            <div className="hidden md:block">
                <LanguageSwitcher />
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-4">
                <Link
                    href="/post"
                    className="rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
                >
                    {t('postAd')}
                </Link>
                {user ? (
                    <>
                        <Link href="/favorites" className="text-sm font-medium text-gray-700 hover:text-gray-900">
                            {t('favorites') || 'Favoris'}
                        </Link>
                        <Link href="/my-listings" className="text-sm font-medium text-gray-700 hover:text-gray-900">
                            {t('myListings')}
                        </Link>
                        <Link href="/account" className="text-sm font-medium text-gray-700 hover:text-gray-900">
                            {t('account')}
                        </Link>
                    </>
                ) : (
                    <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900">
                        {t('login')}
                    </Link>
                )}
            </div>

            {/* Mobile Menu */}
            <MobileMenu user={user} />
        </div>
    );
}

