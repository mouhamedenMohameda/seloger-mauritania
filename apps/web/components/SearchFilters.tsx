'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export interface SearchFiltersState {
    minPrice?: number;
    maxPrice?: number;
    minRooms?: number;
    maxRooms?: number;
    minSurface?: number;
    maxSurface?: number;
    opType?: 'rent' | 'sell';
    sortBy: 'price_asc' | 'price_desc' | 'date_desc' | 'date_asc' | 'surface_desc' | 'surface_asc';
}

interface SearchFiltersProps {
    filters: SearchFiltersState;
    onChange: (filters: SearchFiltersState) => void;
    onClose?: () => void;
}

export default function SearchFilters({ filters, onChange, onClose }: SearchFiltersProps) {
    const { t } = useLanguage();
    const [localFilters, setLocalFilters] = useState<SearchFiltersState>(filters);

    const handleChange = (key: keyof SearchFiltersState, value: any) => {
        const updated = { ...localFilters, [key]: value };
        setLocalFilters(updated);
        onChange(updated);
    };

    const handleReset = () => {
        const reset: SearchFiltersState = {
            sortBy: 'date_desc',
        };
        setLocalFilters(reset);
        onChange(reset);
    };

    const hasActiveFilters = 
        localFilters.minPrice !== undefined ||
        localFilters.maxPrice !== undefined ||
        localFilters.minRooms !== undefined ||
        localFilters.maxRooms !== undefined ||
        localFilters.minSurface !== undefined ||
        localFilters.maxSurface !== undefined ||
        localFilters.opType !== undefined ||
        localFilters.sortBy !== 'date_desc';

    return (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">{t('filters') || 'Filtres'}</h2>
                <div className="flex items-center gap-2">
                    {hasActiveFilters && (
                        <button
                            onClick={handleReset}
                            className="text-sm text-primary hover:text-primary/90 font-medium"
                        >
                            {t('reset') || 'Réinitialiser'}
                        </button>
                    )}
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
            </div>

            <div className="space-y-6">
                {/* Operation Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('type') || 'Type'}
                    </label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleChange('opType', localFilters.opType === 'rent' ? undefined : 'rent')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                localFilters.opType === 'rent'
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {t('forRent') || 'Location'}
                        </button>
                        <button
                            onClick={() => handleChange('opType', localFilters.opType === 'sell' ? undefined : 'sell')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                localFilters.opType === 'sell'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {t('forSale') || 'Vente'}
                        </button>
                    </div>
                </div>

                {/* Price Range */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('price') || 'Prix'} (MRU)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <input
                                type="number"
                                placeholder={t('min') || 'Min'}
                                value={localFilters.minPrice || ''}
                                onChange={(e) => handleChange('minPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                                min="0"
                            />
                        </div>
                        <div>
                            <input
                                type="number"
                                placeholder={t('max') || 'Max'}
                                value={localFilters.maxPrice || ''}
                                onChange={(e) => handleChange('maxPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                                min="0"
                            />
                        </div>
                    </div>
                </div>

                {/* Rooms Range */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('rooms') || 'Pièces'}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <input
                                type="number"
                                placeholder={t('min') || 'Min'}
                                value={localFilters.minRooms || ''}
                                onChange={(e) => handleChange('minRooms', e.target.value ? parseInt(e.target.value) : undefined)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                                min="0"
                            />
                        </div>
                        <div>
                            <input
                                type="number"
                                placeholder={t('max') || 'Max'}
                                value={localFilters.maxRooms || ''}
                                onChange={(e) => handleChange('maxRooms', e.target.value ? parseInt(e.target.value) : undefined)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                                min="0"
                            />
                        </div>
                    </div>
                </div>

                {/* Surface Range */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('surface') || 'Surface'} (m²)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <input
                                type="number"
                                placeholder={t('min') || 'Min'}
                                value={localFilters.minSurface || ''}
                                onChange={(e) => handleChange('minSurface', e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                                min="0"
                            />
                        </div>
                        <div>
                            <input
                                type="number"
                                placeholder={t('max') || 'Max'}
                                value={localFilters.maxSurface || ''}
                                onChange={(e) => handleChange('maxSurface', e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                                min="0"
                            />
                        </div>
                    </div>
                </div>

                {/* Sort By */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('sortBy') || 'Trier par'}
                    </label>
                    <select
                        value={localFilters.sortBy}
                        onChange={(e) => handleChange('sortBy', e.target.value as SearchFiltersState['sortBy'])}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                    >
                        <option value="date_desc">{t('newest') || 'Plus récent'}</option>
                        <option value="date_asc">{t('oldest') || 'Plus ancien'}</option>
                        <option value="price_asc">{t('priceLowToHigh') || 'Prix croissant'}</option>
                        <option value="price_desc">{t('priceHighToLow') || 'Prix décroissant'}</option>
                        <option value="surface_desc">{t('surfaceDesc') || 'Surface décroissante'}</option>
                        <option value="surface_asc">{t('surfaceAsc') || 'Surface croissante'}</option>
                    </select>
                </div>
            </div>
        </div>
    );
}
