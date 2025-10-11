/**
 * Simple localStorage wrapper for observations
 * Keep it simple: just load and save functions
 */


// import type { Observation } from '@/types';

const OBSERVACIONES_KEY = 'observaciones';

export function loadObservaciones(): string[][] {
    try {
        const saved = localStorage.getItem(OBSERVACIONES_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('Error loading observations from localStorage:', error);
        return [];
    }
}

// Removed broken saveObservaciones function

// Update type to accept string[][]
export function saveObservacionesArray(observaciones: string[][]): void {
    try {
        localStorage.setItem(OBSERVACIONES_KEY, JSON.stringify(observaciones));
    } catch (error) {
        console.error('Error saving observations to localStorage:', error);
    }
}
