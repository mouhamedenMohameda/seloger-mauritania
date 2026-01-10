import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import NavBarClient from './NavBarClient'

export default async function NavBar() {
    let user = null
    try {
        const supabase = await createClient()
        const { data } = await supabase.auth.getUser()
        user = data?.user || null
    } catch (error) {
        console.error('NavBar: Failed to fetch user:', error)
    }

    return (
        <nav className="fixed top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-200">
            <div className="mx-auto flex h-24 md:h-28 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <Link href="/" className="flex items-center gap-2">
                    <Image
                        src="/logo.png"
                        alt="raDar"
                        width={540}
                        height={180}
                        className="h-16 sm:h-20 md:h-24 lg:h-28 w-auto object-contain"
                        priority
                    />
                </Link>

                <NavBarClient user={user ? { id: user.id, email: user.email || '' } : null} />
            </div>
        </nav>
    )
}
