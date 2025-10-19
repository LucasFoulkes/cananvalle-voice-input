/**
 * Simple localStorage wrapper for pinches (trimming records)
 * Keep it simple: just load and save functions
 */

const PINCHES_KEY = 'pinches';

export function loadPinches(): string[][] {
    try {
        const saved = localStorage.getItem(PINCHES_KEY);
        if (!saved) return [];
        return JSON.parse(saved) as string[][];
    } catch (error) {
        console.error('Error loading pinches from localStorage:', error);
        return [];
    }
}

export function savePinchesArray(pinches: string[][]): void {
    try {
        localStorage.setItem(PINCHES_KEY, JSON.stringify(pinches));
    } catch (error) {
        console.error('Error saving pinches to localStorage:', error);
    }
}
