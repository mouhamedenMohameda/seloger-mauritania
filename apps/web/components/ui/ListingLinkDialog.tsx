'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useToast } from '@/lib/toast';

interface ListingLinkDialogProps {
    isOpen: boolean;
    onClose: () => void;
    listingId: string;
    listingTitle?: string;
}

export default function ListingLinkDialog({ isOpen, onClose, listingId, listingTitle }: ListingLinkDialogProps) {
    const { t } = useLanguage();
    const toast = useToast();
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const listingUrl = `${window.location.origin}/listings/${listingId}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(listingUrl);
            setCopied(true);
            toast.success(t('copied') || 'Copié !');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error(t('copyFailed') || 'Échec de la copie');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {t('listingCreated') || 'Annonce créée !'}
                    </h2>
                    <p className="text-gray-500 text-sm">
                        {listingTitle || t('untitledListing')}
                    </p>
                </div>

                <div className="space-y-4">
                    <p className="text-sm font-medium text-gray-700">
                        {t('listingLinkDescription') || 'Partagez le lien de votre annonce :'}
                    </p>
                    <div className="flex gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200">
                        <input
                            type="text"
                            readOnly
                            value={listingUrl}
                            className="bg-transparent border-none focus:ring-0 text-gray-600 text-sm flex-1 truncate px-2"
                        />
                        <button
                            onClick={handleCopy}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${copied
                                    ? 'bg-green-600 text-white'
                                    : 'bg-primary text-white hover:bg-primary/90'
                                }`}
                        >
                            {copied ? (t('copied') || 'Copié !') : (t('copy') || 'Copier')}
                        </button>
                    </div>
                </div>

                <div className="mt-8">
                    <button
                        onClick={onClose}
                        className="w-full py-3 text-sm font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                    >
                        {t('close') || 'Fermer'}
                    </button>
                </div>
            </div>
        </div>
    );
}
