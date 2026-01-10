import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import NavBarClient from './NavBarClient'
import NavBarContainer from './NavBarContainer'

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
        <NavBarContainer>
            <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <Link href="/" className="flex items-center gap-2">
                    <Image
                        src="/logo.png"
                        alt="raDar"
                        width={540}
                        height={180}
                        className="h-16 sm:h-20 md:h-22 lg:h-24 w-auto object-contain transition-all duration-500"
                        priority
                    />
                </Link>

                <NavBarClient user={user ? { id: user.id, email: user.email || '' } : null} />
            </div>
        </NavBarContainer>
    )
}
