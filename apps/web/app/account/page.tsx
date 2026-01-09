'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Profile {
    id: string;
    role: 'user' | 'admin';
    full_name: string | null;
    phone: string | null;
    created_at: string;
}

interface User {
    id: string;
    email: string;
}

export default function AccountPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
    });

    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient();
            const { data: { user: authUser } } = await supabase.auth.getUser();

            if (!authUser) {
                router.push('/login?redirect=/account');
                return;
            }

            try {
                const res = await fetch('/api/me');
                if (!res.ok) {
                    throw new Error('Failed to fetch profile');
                }
                const data = await res.json();
                setUser(data.user);
                setProfile(data.profile);
                setFormData({
                    full_name: data.profile?.full_name || '',
                    phone: data.profile?.phone || '',
                });
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load profile');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError(null);
        setSuccess(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch('/api/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to update profile');
            }

            const updatedProfile = await res.json();
            setProfile(updatedProfile);
            setSuccess('Profile updated successfully!');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">{t('loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                <div className="mb-10">
                    <h1 className="text-2xl font-bold text-gray-900">{t('accountSettings')}</h1>
                    <p className="mt-1 text-sm text-gray-500">{t('manageProfile')}</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">{success}</p>
                    </div>
                )}

                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-6">
                    {/* Profile Information */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('profileInfo')}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    {t('email')}
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
                                />
                                <p className="mt-1 text-xs text-gray-500">{t('emailCantChange')}</p>
                            </div>

                            <div>
                                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    {t('fullName')}
                                </label>
                                <input
                                    id="full_name"
                                    name="full_name"
                                    type="text"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 bg-white"
                                    placeholder={t('fullNamePlaceholder')}
                                />
                            </div>

                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    {t('phone')}
                                </label>
                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 bg-white"
                                    placeholder={t('phonePlaceholder')}
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 active:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {saving ? t('saving') : t('saveChanges')}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Quick Links */}
                    <div className="pt-6 border-t border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('quickLinks')}</h2>
                        <div className="space-y-3">
                            <Link
                                href="/my-listings"
                                className="block w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-center"
                            >
                                {t('myListings')}
                            </Link>
                            <Link
                                href="/post"
                                className="block w-full px-4 py-2 text-sm font-semibold text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-center"
                            >
                                {t('postNewListing')}
                            </Link>
                        </div>
                    </div>

                    {/* Account Actions */}
                    <div className="pt-6 border-t border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('accountActions')}</h2>
                        <div className="space-y-3">
                            <button
                                onClick={handleLogout}
                                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                {t('signOut')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

