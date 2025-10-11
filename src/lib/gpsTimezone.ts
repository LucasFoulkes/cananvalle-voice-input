import type { GpsCoordinates, GpsLocation } from '@/types'

/**
 * Get IANA timezone from GPS coordinates
 * Uses a simple approximation based on longitude
 * For production, consider using a library like 'geo-tz' or an API
 */
export function getTimezoneFromGPS(gps: GpsCoordinates | GpsLocation | null | undefined): string {
    if (!gps) {
        return 'America/Guayaquil' // Default to Ecuador
    }

    // Extract coordinates (handle both formats)
    const lat = (gps as any).latitude ?? (gps as any).latitud
    const lng = (gps as any).longitude ?? (gps as any).longitud

    if (lat == null || lng == null) {
        return 'America/Guayaquil'
    }

    // Ecuador region detection (approximate)
    if (lat >= -5 && lat <= 2 && lng >= -82 && lng <= -75) {
        return 'America/Guayaquil'
    }

    // Simple timezone mapping based on longitude zones
    // This is a rough approximation - for production use a proper library
    const timezoneMap = [
        { min: -180, max: -157.5, tz: 'Pacific/Midway' },
        { min: -157.5, max: -142.5, tz: 'Pacific/Honolulu' },
        { min: -142.5, max: -127.5, tz: 'America/Anchorage' },
        { min: -127.5, max: -112.5, tz: 'America/Los_Angeles' },
        { min: -112.5, max: -97.5, tz: 'America/Denver' },
        { min: -97.5, max: -82.5, tz: 'America/Chicago' },
        { min: -82.5, max: -67.5, tz: 'America/New_York' },
        { min: -67.5, max: -52.5, tz: 'America/Caracas' },
        { min: -52.5, max: -37.5, tz: 'America/Sao_Paulo' },
        { min: -37.5, max: -22.5, tz: 'Atlantic/South_Georgia' },
        { min: -22.5, max: -7.5, tz: 'Atlantic/Azores' },
        { min: -7.5, max: 7.5, tz: 'Europe/London' },
        { min: 7.5, max: 22.5, tz: 'Europe/Paris' },
        { min: 22.5, max: 37.5, tz: 'Europe/Athens' },
        { min: 37.5, max: 52.5, tz: 'Europe/Moscow' },
        { min: 52.5, max: 67.5, tz: 'Asia/Yekaterinburg' },
        { min: 67.5, max: 82.5, tz: 'Asia/Dhaka' },
        { min: 82.5, max: 97.5, tz: 'Asia/Bangkok' },
        { min: 97.5, max: 112.5, tz: 'Asia/Hong_Kong' },
        { min: 112.5, max: 127.5, tz: 'Asia/Tokyo' },
        { min: 127.5, max: 142.5, tz: 'Australia/Sydney' },
        { min: 142.5, max: 157.5, tz: 'Pacific/Guadalcanal' },
        { min: 157.5, max: 172.5, tz: 'Pacific/Fiji' },
        { min: 172.5, max: 180, tz: 'Pacific/Tongatapu' },
    ]

    for (const zone of timezoneMap) {
        if (lng >= zone.min && lng < zone.max) {
            return zone.tz
        }
    }

    return 'UTC'
}

/**
 * Format a date/time in the timezone where it was recorded (based on GPS)
 */
export function formatDateInRecordedTimezone(
    timestamp: string,
    gps: GpsCoordinates | GpsLocation | null | undefined,
    options: Intl.DateTimeFormatOptions = {}
): string {
    if (!timestamp) return '-'

    const timezone = getTimezoneFromGPS(gps)
    const date = new Date(timestamp)

    return date.toLocaleString('es-ES', {
        ...options,
        timeZone: timezone
    })
}

/**
 * Format time in the timezone where it was recorded (based on GPS)
 */
export function formatTimeInRecordedTimezone(
    timestamp: string,
    gps: GpsCoordinates | GpsLocation | null | undefined
): string {
    return formatDateInRecordedTimezone(timestamp, gps, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    })
}

/**
 * Format date in the timezone where it was recorded (based on GPS)
 */
export function formatDateGroupInRecordedTimezone(
    timestamp: string,
    gps: GpsCoordinates | GpsLocation | null | undefined
): string {
    return formatDateInRecordedTimezone(timestamp, gps, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    })
}
