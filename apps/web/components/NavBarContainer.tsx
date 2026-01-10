'use client';

import React, { useState, useEffect } from 'react';

interface NavBarContainerProps {
    children: React.ReactNode;
}

export default function NavBarContainer({ children }: NavBarContainerProps) {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav
            className={`fixed top-0 z-50 w-full transition-all duration-500 ease-out-expo ${scrolled
                    ? 'h-20 bg-white/95 backdrop-blur-md shadow-md border-b border-gray-200/50'
                    : 'h-24 md:h-28 bg-white/80 backdrop-blur-sm border-b border-transparent'
                }`}
        >
            {children}
        </nav>
    );
}
