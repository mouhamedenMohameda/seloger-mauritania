import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function NavBar() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    return (
        <nav className="fixed top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-200">
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <Link href="/" className="text-xl font-bold tracking-tight text-indigo-600">
                    SeLoger<span className="text-gray-900">MR</span>
                </Link>
                <div className="flex items-center gap-4">
                    <Link
                        href="/post"
                        className="rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
                    >
                        Post Ad
                    </Link>
                    {user ? (
                        <>
                            <Link href="/my-listings" className="text-sm font-medium text-gray-700 hover:text-gray-900">
                                My Listings
                            </Link>
                            <Link href="/account" className="text-sm font-medium text-gray-700 hover:text-gray-900">
                                Account
                            </Link>
                        </>
                    ) : (
                        <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900">
                            Log in
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    )
}
