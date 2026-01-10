'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { NOUAKCHOTT_NEIGHBORHOODS } from '@/lib/geocoding';

interface NeighborhoodSuggestionsProps {
    onSelect: (lat: number, lng: number, name: string) => void;
    onClose?: () => void;
}

export default function NeighborhoodSuggestions({ onSelect, onClose }: NeighborhoodSuggestionsProps) {
    const { t } = useLanguage();
    const [query, setQuery] = useState('');
    const [filtered, setFiltered] = useState<typeof NOUAKCHOTT_NEIGHBORHOODS[number][]>([...NOUAKCHOTT_NEIGHBORHOODS]);

    useEffect(() => {
        if (!query || query.length < 1) {
            setFiltered([...NOUAKCHOTT_NEIGHBORHOODS]);
            return;
        }

        const lowerQuery = query.toLowerCase();
        const results = NOUAKCHOTT_NEIGHBORHOODS.filter(n => 
            n.name.toLowerCase().includes(lowerQuery) ||
            n.displayName.toLowerCase().includes(lowerQuery)
        );
        setFiltered([...results]);
    }, [query]);

    return (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                    {t('neighborhoods') || 'Quartiers de Nouakchott'}
                </h3>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                        aria-label="Close"
                    >
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchNeighborhoods') || 'Rechercher un quartier...'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/50 focus:border-transparent mb-3"
            />

            <div className="max-h-64 overflow-y-auto space-y-1">
                {filtered.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p>{t('noNeighborhoodsFound') || 'Aucun quartier trouvé'}</p>
                    </div>
                ) : (
                    filtered.map((neighborhood) => (
                        <button
                            key={neighborhood.name}
                            onClick={() => {
                                onSelect(neighborhood.lat, neighborhood.lng, neighborhood.displayName);
                                if (onClose) onClose();
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-primary/5 rounded-md transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
                                        {neighborhood.name}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                        {neighborhood.displayName}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}

