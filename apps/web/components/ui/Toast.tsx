'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    message: string;
    type?: ToastType;
    duration?: number;
    onClose: () => void;
}

export default function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
    const { t } = useLanguage();

    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const icons = {
        success: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
        ),
        error: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        ),
        info: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        warning: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        ),
    };

    const colors = {
        success: 'bg-green-50 border-green-200 text-green-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    };

    return (
        <div
            className={`fixed top-20 right-4 z-[3000] px-4 py-3 rounded-lg border shadow-lg flex items-center gap-3 animate-in slide-in-from-right ${colors[type]}`}
        >
            <div className="flex-shrink-0">
                {icons[type]}
            </div>
            <p className="text-sm font-medium flex-1">{message}</p>
            <button
                onClick={onClose}
                className="flex-shrink-0 hover:opacity-70 transition-opacity"
                aria-label="Close"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

