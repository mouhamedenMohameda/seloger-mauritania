'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ReactNode } from 'react';

interface EmptyStateProps {
    title?: string;
    message?: string;
    icon?: ReactNode;
    action?: ReactNode;
}

export default function EmptyState({ title, message, icon, action }: EmptyStateProps) {
    const { t } = useLanguage();

    const defaultIcon = (
        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
    );

    return (
        <div className="w-full flex flex-col items-center justify-center py-12 px-4">
            <div className="mb-6">
                {icon || defaultIcon}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
                {title || t('noResults') || 'Aucun résultat'}
            </h3>
            {message && (
                <p className="text-sm text-gray-500 text-center max-w-md mb-6">
                    {message}
                </p>
            )}
            {action && (
                <div className="mt-4">
                    {action}
                </div>
            )}
        </div>
    );
}

