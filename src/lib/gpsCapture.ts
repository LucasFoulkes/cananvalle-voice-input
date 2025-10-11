import type { GpsCoordinates } from '@/types'

/**
 * Captures the current GPS location using the browser's Geolocation API
 * Returns null if location access is denied or unavailable
 */
export async function captureCurrentLocation(): Promise<GpsCoordinates | null> {
    if (!navigator.geolocation) {
        console.warn('Geolocation is not supported by this browser')
        return null
    }

    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    altitude: position.coords.altitude,
                    timestamp: position.timestamp
                })
            },
            (error) => {
                console.warn('Error getting location:', error.message)
                resolve(null)
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        )
    })
}

/**
 * Formats GPS coordinates as a JSON string for storage
 */
export function formatGpsForStorage(coords: GpsCoordinates | null): string {
    if (!coords) return ''
    return JSON.stringify(coords)
}
