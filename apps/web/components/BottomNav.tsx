"use client";

import React from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface BottomNavProps {
    activeTab: 'map' | 'list' | 'messages' | 'profile';
    onTabChange: (tab: 'map' | 'list' | 'messages' | 'profile') => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
    const { t } = useLanguage();

    const tabs = [
        {
            id: 'map' as const,
            label: t('viewMap') || 'Carte',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A2 2 0 013 15.488V5.105a2 2 0 011.106-1.789l5.447-2.724a2 2 0 011.894 0l5.447 2.724A2 2 0 0118 5.105v10.383a2 2 0 01-1.106 1.789L11.447 19.83a2 2 0 01-1.894 0z" />
                </svg>
            )
        },
        {
            id: 'list' as const,
            label: t('viewList') || 'Annonces',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            )
        },
        {
            id: 'messages' as const,
            label: t('messages') || 'Messages',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
            ),
            disabled: true
        },
        {
            id: 'profile' as const,
            label: t('account') || 'Profil',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            )
        }
    ];

    return (
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-[5001] pb-safe">
            <div className="flex items-center justify-around h-16">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => !tab.disabled && onTabChange(tab.id)}
                            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-400'
                                } ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95 transition-transform'}`}
                        >
                            <div className={`${isActive ? 'scale-110' : 'scale-100'} transition-transform`}>
                                {tab.icon}
                            </div>
                            <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">
                                {tab.label}
                            </span>
                            {isActive && (
                                <div className="absolute top-0 w-8 h-1 bg-indigo-600 rounded-b-full shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
