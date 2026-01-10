'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';

interface LoadingStateProps {
    message?: string;
    fullScreen?: boolean;
}

export default function LoadingState({ message, fullScreen = false }: LoadingStateProps) {
    const { t } = useLanguage();

    const content = (
        <div className="flex flex-col items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
            <p className="text-sm font-medium text-gray-700">{message || t('loading') || 'Chargement...'}</p>
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
                {content}
            </div>
        );
    }

    return (
        <div className="w-full flex items-center justify-center py-12">
            {content}
        </div>
    );
}

