'use client';

import { useState, useCallback, useEffect } from 'react';
import Toast, { ToastType } from '@/components/ui/Toast';

interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
}

let toastId = 0;
let toastListeners: Array<(toasts: ToastItem[]) => void> = [];
let toasts: ToastItem[] = [];

function notifyListeners() {
    toastListeners.forEach(listener => listener([...toasts]));
}

export function useToast() {
    const [currentToasts, setCurrentToasts] = useState<ToastItem[]>([]);

    useEffect(() => {
        toastListeners.push(setCurrentToasts);
        setCurrentToasts([...toasts]);
        return () => {
            toastListeners = toastListeners.filter(l => l !== setCurrentToasts);
        };
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = `toast-${++toastId}`;
        toasts.push({ id, message, type });
        notifyListeners();
    }, []);

    const removeToast = useCallback((id: string) => {
        toasts = toasts.filter(t => t.id !== id);
        notifyListeners();
    }, []);

    return {
        toasts: currentToasts,
        showToast,
        removeToast,
        success: (message: string) => showToast(message, 'success'),
        error: (message: string) => showToast(message, 'error'),
        info: (message: string) => showToast(message, 'info'),
        warning: (message: string) => showToast(message, 'warning'),
    };
}

export function ToastContainer() {
    const { toasts, removeToast } = useToast();

    return (
        <>
            {toasts.map((toast, index) => (
                <div
                    key={toast.id}
                    style={{ top: `${80 + index * 70}px` }}
                    className="fixed right-4 z-[3000]"
                >
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => removeToast(toast.id)}
                    />
                </div>
            ))}
        </>
    );
}

