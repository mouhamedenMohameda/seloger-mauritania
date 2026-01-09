'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ReactNode } from 'react';

interface ErrorStateProps {
    title?: string;
    message: string;
    icon?: ReactNode;
    action?: ReactNode;
    onRetry?: () => void;
}

export default function ErrorState({ title, message, icon, action, onRetry }: ErrorStateProps) {
    const { t } = useLanguage();

    const defaultIcon = (
        <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    );

    return (
        <div className="w-full flex flex-col items-center justify-center py-12 px-4">
            <div className="mb-6">
                {icon || defaultIcon}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
                {title || t('error') || 'Erreur'}
            </h3>
            <p className="text-sm text-gray-600 text-center max-w-md mb-6">
                {message}
            </p>
            <div className="flex gap-3">
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
                    >
                        {t('retry') || 'Réessayer'}
                    </button>
                )}
                {action}
            </div>
        </div>
    );
}

