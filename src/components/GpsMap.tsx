import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { GpsPoint, UserInfo } from '@/types'

type Props = {
  points: GpsPoint[]
  userColors: Record<string, string>
  users: UserInfo[]
}

export function GpsMap({ points, userColors, users }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const [timeFilter, setTimeFilter] = useState(100) // Percentage 0-100

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Initialize map
    const map = L.map(mapRef.current, {
      zoomControl: false
    }).setView([0, -78], 13)

    // Add tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: ''
    }).addTo(map)

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current || points.length === 0) return

    const map = mapInstanceRef.current

    // Clear existing markers
    map.eachLayer((layer: L.Layer) => {
      if (layer instanceof L.Circle || layer instanceof L.CircleMarker) {
        map.removeLayer(layer)
      }
    })

    const markers: (L.Circle | L.CircleMarker)[] = []

    // Sort points by time
    const sortedPoints = [...points].sort((a, b) =>
      new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime()
    )

    // Calculate how many points to show based on slider
    const pointsToShow = Math.ceil(sortedPoints.length * (timeFilter / 100))
    const filteredPoints = sortedPoints.slice(0, pointsToShow)

    // Add markers for each point
    filteredPoints.forEach(point => {
      const color = point.usuario_id ? userColors[point.usuario_id] || '#3388ff' : '#3388ff'

      // Calculate opacity based on precision (larger precision = more transparent)
      // Solid at 1m precision, very transparent at higher precision (48x steeper slope)
      const minPrecision = 1
      const maxPrecision = 2000
      const normalizedPrecision = Math.min(Math.max(point.precision, minPrecision), maxPrecision)
      const transparency = (normalizedPrecision - minPrecision) / (maxPrecision - minPrecision)
      // Much steeper curve: raise transparency to power of 0.02125 (48th root) to make it 48x steeper
      const steeperTransparency = Math.pow(transparency, 0.02125)
      const opacity = Math.max(1 - steeperTransparency, 0.02) // Solid at 1m, very transparent at 2000m

      // Use L.circle to display radius in meters (not pixels) - no border
      const marker = L.circle([point.latitud, point.longitud], {
        radius: point.precision, // Radius in meters
        fillColor: color,
        color: color,
        weight: 0,
        opacity: 0,
        fillOpacity: opacity
      }).addTo(map)

      markers.push(marker)

      // Add a small solid dot in the center
      const centerDot = L.circleMarker([point.latitud, point.longitud], {
        radius: 1, // 1 pixel radius
        fillColor: color,
        color: color,
        weight: 0,
        opacity: 1,
        fillOpacity: 1
      }).addTo(map)

      markers.push(centerDot)
    })

    // Fit bounds to show all markers
    if (markers.length > 0) {
      const markerGroup = L.featureGroup(markers)
      map.fitBounds(markerGroup.getBounds(), {
        padding: [50, 50]
      })
    }
  }, [points, userColors, timeFilter])

  // Get time range for display
  const getTimeRange = () => {
    if (points.length === 0) return { start: '', end: '' }

    const sortedPoints = [...points].sort((a, b) =>
      new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime()
    )

    const pointsToShow = Math.ceil(sortedPoints.length * (timeFilter / 100))
    const filteredPoints = sortedPoints.slice(0, pointsToShow)

    if (filteredPoints.length === 0) return { start: '', end: '' }

    const start = new Date(filteredPoints[0].creado_en)
    const end = new Date(filteredPoints[filteredPoints.length - 1].creado_en)

    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    }

    return { start: formatTime(start), end: formatTime(end) }
  }

  const timeRange = getTimeRange()

  return (
    <div className='flex flex-col gap-2'>
      <div ref={mapRef} className='h-[500px] w-full rounded-lg' />
      <div className='px-4 pb-2'>
        <div className='flex items-center justify-between text-xs text-zinc-400 mb-1'>
          <span>{timeRange.start}</span>
          <span className='text-white'>{Math.ceil(points.length * (timeFilter / 100))} / {points.length} puntos</span>
          <span>{timeRange.end}</span>
        </div>
        <input
          type='range'
          min='0'
          max='100'
          value={timeFilter}
          onChange={(e) => setTimeFilter(Number(e.target.value))}
          className='w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500'
        />
      </div>
      <div className='px-4 pb-2'>
        <div className='flex flex-wrap gap-3'>
          {users.map(user => (
            <div key={user.id_usuario} className='flex items-center gap-2'>
              <div
                className='w-3 h-3 rounded-full'
                style={{ backgroundColor: userColors[user.id_usuario] || '#3388ff' }}
              />
              <span className='text-xs text-white'>
                {user.nombres} {user.apellidos || ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
