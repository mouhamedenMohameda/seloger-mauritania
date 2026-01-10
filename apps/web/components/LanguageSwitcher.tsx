'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function LanguageSwitcher() {
    const { lang, setLang } = useLanguage();

    return (
        <div className="flex items-center gap-1 bg-gray-100 rounded-full p-0.5">
            <button
                onClick={() => setLang('fr')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    lang === 'fr'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                }`}
            >
                FR
            </button>
            <button
                onClick={() => setLang('ar')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    lang === 'ar'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                }`}
            >
                عربي
            </button>
        </div>
    );
}

