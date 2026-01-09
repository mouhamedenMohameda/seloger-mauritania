'use client';

import { ReactNode } from 'react';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import { ReactQueryProvider } from '@/lib/react-query';

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <ReactQueryProvider>
        <LanguageProvider>
            {children}
        </LanguageProvider>
        </ReactQueryProvider>
    );
}

