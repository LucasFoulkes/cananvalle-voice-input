import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type GpsPoint = {
  id: string
  latitud: number
  longitud: number
  precision: number
  usuario_id: string | null
  creado_en: string
}

type Props = {
  points: GpsPoint[]
  userColors: Record<string, string>
}

export function GpsMap({ points, userColors }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

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

    const markers: L.Circle[] = []

    // Add markers for each point
    points.forEach(point => {
      const color = point.usuario_id ? userColors[point.usuario_id] || '#3388ff' : '#3388ff'

      // Calculate opacity based on precision (larger precision = more transparent)
      // Solid at 1m precision, very transparent at 2000m
      const minPrecision = 1
      const maxPrecision = 2000
      const normalizedPrecision = Math.min(Math.max(point.precision, minPrecision), maxPrecision)
      const transparency = (normalizedPrecision - minPrecision) / (maxPrecision - minPrecision)
      const opacity = Math.max(1 - transparency, 0.02) // Min opacity 0.02 for high transparency at 2000m

      // Use L.circle to display radius in meters (not pixels)
      const marker = L.circle([point.latitud, point.longitud], {
        radius: point.precision, // Radius in meters
        fillColor: color,
        color: color,
        weight: 1,
        opacity: opacity,
        fillOpacity: opacity
      }).addTo(map)

      markers.push(marker)
    })

    // Fit bounds to show all markers
    if (markers.length > 0) {
      const markerGroup = L.featureGroup(markers)
      map.fitBounds(markerGroup.getBounds(), {
        padding: [50, 50]
      })
    }
  }, [points, userColors])

  return (
    <div ref={mapRef} className='h-[500px] w-full rounded-lg' />
  )
}
