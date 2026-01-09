import { describe, it, expect, vi, beforeEach } from 'vitest';
// Mock the Toast component before it's imported in the tests
vi.mock('@/components/ui/Toast', () => ({
    default: () => null
}));

import { renderHook, act } from '@testing-library/react';

describe('Toast Utility', () => {
    let useToast: any;

    beforeEach(async () => {
        vi.resetModules();
        const module = await import('../toast');
        useToast = module.useToast;
    });

    it('should add a toast when showToast is called', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
            result.current.success('Test Success');
        });

        expect(result.current.toasts.length).toBe(1);
        expect(result.current.toasts[0].message).toBe('Test Success');
        expect(result.current.toasts[0].type).toBe('success');
    });

    it('should remove a toast by id', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
            result.current.info('Persistent Toast');
        });

        const toastId = result.current.toasts[0].id;

        act(() => {
            result.current.removeToast(toastId);
        });

        expect(result.current.toasts.length).toBe(0);
    });

    it('should handle multiple toast types', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
            result.current.error('Error Toast');
            result.current.warning('Warning Toast');
        });

        expect(result.current.toasts.length).toBe(2);
        expect(result.current.toasts[0].type).toBe('error');
        expect(result.current.toasts[1].type).toBe('warning');
    });
});
