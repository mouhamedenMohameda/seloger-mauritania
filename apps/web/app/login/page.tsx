'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const { t } = useLanguage()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        const supabase = createClient()

        if (isLogin) {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })
            if (error) {
                setMessage(error.message)
            } else {
                setMessage(t('loggedIn'))
                window.location.href = '/'
            }
        } else {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                }
            })
            if (error) {
                setMessage(error.message)
            } else {
                setMessage(t('checkEmail'))
            }
        }
        setLoading(false)
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
            <div className="w-full max-w-md bg-white rounded-lg shadow-md overflow-hidden">
                <div className="flex border-b">
                    <button
                        className={`flex-1 py-4 text-center font-medium ${isLogin ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => { setIsLogin(true); setMessage(''); }}
                    >
                        {t('signIn')}
                    </button>
                    <button
                        className={`flex-1 py-4 text-center font-medium ${!isLogin ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => { setIsLogin(false); setMessage(''); }}
                    >
                        {t('signUp')}
                    </button>
                </div>

                <div className="p-8">
                    <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
                        {isLogin ? t('welcomeBack') : t('createAccount')}
                    </h2>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
                            <input
                                type="email"
                                required
                                className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {loading ? (isLogin ? t('signingIn') : t('signingUp')) : (isLogin ? t('signIn') : t('signUp'))}
                        </button>
                    </form>

                    {message && (
                        <div className={`mt-4 p-3 rounded text-sm text-center ${message.includes(t('checkEmail')) || message.includes(t('loggedIn')) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
