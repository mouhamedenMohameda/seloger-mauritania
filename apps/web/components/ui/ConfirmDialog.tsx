'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ReactNode } from 'react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: 'danger' | 'primary';
    icon?: ReactNode;
}

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    cancelText,
    confirmVariant = 'danger',
    icon,
}: ConfirmDialogProps) {
    const { t } = useLanguage();

    if (!isOpen) return null;

    const defaultIcon = confirmVariant === 'danger' ? (
        <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    ) : (
        <svg className="w-12 h-12 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                        {icon || defaultIcon}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                            {title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                            {message}
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                {cancelText || t('cancel') || 'Annuler'}
                            </button>
                            <button
                                onClick={handleConfirm}
                                className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                                    confirmVariant === 'danger'
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                            >
                                {confirmText || t('confirm') || 'Confirmer'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

