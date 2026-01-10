"use client";

import React from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface MobileMapControlsProps {
    showMap: boolean;
    onToggleView: () => void;
    onSearchClick: () => void;
    query?: string;
    hideToggle?: boolean;
}

export default function MobileMapControls({
    showMap,
    onToggleView,
    onSearchClick,
    query,
    hideToggle = false
}: MobileMapControlsProps) {
    const { t } = useLanguage();

    return (
        <div className="flex items-center gap-0 w-full max-w-[94vw] mx-auto glass-effect rounded-2xl shadow-xl overflow-hidden border-white/40">
            {/* Search Trigger Section */}
            <button
                onClick={onSearchClick}
                className="flex-1 flex items-center gap-4 ps-5 pe-2 py-5 text-start active:bg-white/20 transition-all"
            >
                <div className="p-2.5 bg-primary/10 rounded-xl shadow-inner">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <div className="flex flex-col truncate">
                    <span className="text-[10px] font-bold text-primary/70 uppercase tracking-[0.2em]">{t('searchPlaceholder').split(' ')[0]}</span>
                    <span className="text-sm font-bold text-gray-900 truncate">
                        {query || t('searchPlaceholder')}
                    </span>
                </div>
            </button>

            {/* Divider and Toggle View Section */}
            {!hideToggle && (
                <>
                    <div className="w-px h-12 bg-gray-200/30 self-center" />
                    <button
                        onClick={onToggleView}
                        className="flex flex-col items-center justify-center px-7 py-5 bg-primary text-white hover:bg-primary/90 active:scale-95 transition-all gap-1.5"
                    >
                        {showMap ? (
                            <>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                                <span className="text-[9px] font-black uppercase tracking-widest">{t('viewList')}</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 20l-5.447-2.724A2 2 0 013 15.488V5.105a2 2 0 011.106-1.789l5.447-2.724a2 2 0 011.894 0l5.447 2.724A2 2 0 0118 5.105v10.383a2 2 0 01-1.106 1.789L11.447 19.83a2 2 0 01-1.894 0z" />
                                </svg>
                                <span className="text-[9px] font-black uppercase tracking-widest">{t('viewMap')}</span>
                            </>
                        )}
                    </button>
                </>
            )}
        </div>
    );
}
