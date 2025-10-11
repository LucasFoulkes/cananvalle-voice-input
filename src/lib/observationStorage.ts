/**
 * Simple localStorage wrapper for observations
 * Keep it simple: just load and save functions
 */

const OBSERVACIONES_KEY = 'observaciones';

export function loadObservaciones(): string[][] {
    try {
        const saved = localStorage.getItem(OBSERVACIONES_KEY);
        if (!saved) return [];
        return JSON.parse(saved) as string[][];
    } catch (error) {
        console.error('Error loading observations from localStorage:', error);
        return [];
    }
}

export function saveObservacionesArray(observaciones: string[][]): void {
    try {
        localStorage.setItem(OBSERVACIONES_KEY, JSON.stringify(observaciones));
    } catch (error) {
        console.error('Error saving observations to localStorage:', error);
    }
}

