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
        <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 -right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

            <div className="w-full max-w-md glass-effect rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up border-white/40">
                <div className="flex p-2 bg-gray-100/50 backdrop-blur-sm m-6 rounded-2xl">
                    <button
                        className={`flex-1 py-3 text-center text-sm font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${isLogin ? 'bg-white text-primary shadow-lg' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => { setIsLogin(true); setMessage(''); }}
                    >
                        {t('signIn')}
                    </button>
                    <button
                        className={`flex-1 py-3 text-center text-sm font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${!isLogin ? 'bg-white text-primary shadow-lg' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => { setIsLogin(false); setMessage(''); }}
                    >
                        {t('signUp')}
                    </button>
                </div>

                <div className="px-8 pb-10">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                            {isLogin ? t('welcomeBack') : t('createAccount')}
                        </h2>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                            {isLogin ? 'raDar account' : 'Join raDar'}
                        </p>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">{t('email')}</label>
                            <input
                                type="email"
                                required
                                className="block w-full rounded-2xl border-gray-200 bg-white/50 px-4 py-3.5 text-sm font-bold text-gray-900 shadow-inner focus:border-primary focus:ring-primary/20 transition-all"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">{t('password')}</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                className="block w-full rounded-2xl border-gray-200 bg-white/50 px-4 py-3.5 text-sm font-bold text-gray-900 shadow-inner focus:border-primary focus:ring-primary/20 transition-all"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-xl text-sm font-black uppercase tracking-widest text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-all active:scale-95 overflow-hidden"
                        >
                            <span className="relative z-10">{loading ? (isLogin ? t('signingIn') : t('signingUp')) : (isLogin ? t('signIn') : t('signUp'))}</span>
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </form>

                    {message && (
                        <div className={`mt-6 p-4 rounded-2xl text-xs font-bold text-center animate-fade-in-up ${message.includes(t('checkEmail')) || message.includes(t('loggedIn'))
                            ? 'bg-green-50 text-green-600 border border-green-100'
                            : 'bg-red-50 text-red-600 border border-red-100'}`}>
                            {message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
