"use client";

import React from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface MobileMapControlsProps {
    showMap: boolean;
    onToggleView: () => void;
    onSearchClick: () => void;
    query?: string;
}

export default function MobileMapControls({
    showMap,
    onToggleView,
    onSearchClick,
    query
}: MobileMapControlsProps) {
    const { t } = useLanguage();

    return (
        <div className="flex items-center gap-0 w-full max-w-[92vw] mx-auto bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden">
            {/* Search Trigger Section */}
            <button
                onClick={onSearchClick}
                className="flex-1 flex items-center gap-3 ps-4 pe-2 py-4 text-start active:bg-gray-50 transition-colors"
            >
                <div className="p-2 bg-indigo-50 rounded-lg">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <div className="flex flex-col truncate">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('searchPlaceholder').split(' ')[0]}</span>
                    <span className="text-sm font-black text-gray-900 truncate">
                        {query || t('searchPlaceholder')}
                    </span>
                </div>
            </button>

            {/* Divider */}
            <div className="w-px h-10 bg-gray-100 self-center" />

            {/* Toggle View Section */}
            <button
                onClick={onToggleView}
                className="flex flex-col items-center justify-center px-6 py-4 bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all gap-1"
            >
                {showMap ? (
                    <>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        <span className="text-[10px] font-black uppercase tracking-tighter">{t('viewList')}</span>
                    </>
                ) : (
                    <>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 20l-5.447-2.724A2 2 0 013 15.488V5.105a2 2 0 011.106-1.789l5.447-2.724a2 2 0 011.894 0l5.447 2.724A2 2 0 0118 5.105v10.383a2 2 0 01-1.106 1.789L11.447 19.83a2 2 0 01-1.894 0z" />
                        </svg>
                        <span className="text-[10px] font-black uppercase tracking-tighter">{t('viewMap')}</span>
                    </>
                )}
            </button>
        </div>
    );
}
