import { describe, it, expect, vi } from 'vitest';
import { debounce } from '../utils';

describe('Utility Function Regression Tests', () => {
    describe('debounce', () => {
        it('should delay function execution', () => {
            vi.useFakeTimers();
            const fn = vi.fn();
            const debounced = debounce(fn, 100);

            debounced();
            expect(fn).not.toHaveBeenCalled();

            vi.advanceTimersByTime(50);
            expect(fn).not.toHaveBeenCalled();

            vi.advanceTimersByTime(51);
            expect(fn).toHaveBeenCalledTimes(1);
            vi.useRealTimers();
        });

        it('should only execute once for multiple calls', () => {
            vi.useFakeTimers();
            const fn = vi.fn();
            const debounced = debounce(fn, 100);

            debounced();
            debounced();
            debounced();

            vi.advanceTimersByTime(101);
            expect(fn).toHaveBeenCalledTimes(1);
            vi.useRealTimers();
        });

        it('should pass arguments to the function', () => {
            vi.useFakeTimers();
            const fn = vi.fn();
            const debounced = debounce(fn, 100);

            debounced('test', 123);
            vi.advanceTimersByTime(101);
            expect(fn).toHaveBeenCalledWith('test', 123);
            vi.useRealTimers();
        });
    });
});
