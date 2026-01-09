'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language, TranslationKey } from './translations';

interface LanguageContextType {
    lang: Language;
    setLang: (lang: Language) => void;
    t: (key: TranslationKey) => string;
    dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Language>('fr');

    useEffect(() => {
        // Load saved language from localStorage
        const savedLang = localStorage.getItem('seloger-lang') as Language;
        if (savedLang && (savedLang === 'fr' || savedLang === 'ar')) {
            setLangState(savedLang);
        }
    }, []);

    const setLang = (newLang: Language) => {
        setLangState(newLang);
        localStorage.setItem('seloger-lang', newLang);
        // Update document direction
        document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = newLang;
    };

    useEffect(() => {
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
    }, [lang]);

    const t = (key: TranslationKey): string => {
        return translations[lang][key] || translations.fr[key] || key;
    };

    const dir = lang === 'ar' ? 'rtl' : 'ltr';

    return (
        <LanguageContext.Provider value={{ lang, setLang, t, dir }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}

