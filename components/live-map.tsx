'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Incident } from '@/lib/types'

interface LiveMapProps {
  incidents: Incident[]
  selectedIncident: Incident | null
}

// Fix Leaflet default icons in Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const AccidentIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iNDIiIHZpZXdCb3g9IjAgMCAzMiA0MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iNDIiIHJ4PSI0IiBmaWxsPSIjZWYzYzFkIi8+PHRleHQgeD0iMTYiIHk9IjI4IiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiPvCZoTwvdGV4dD48L3N2Zz4=',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -34],
  shadowSize: [41, 41],
})

const SafeIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iNDIiIHZpZXdCb3g9IjAgMCAzMiA0MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iNDIiIHJ4PSI0IiBmaWxsPSIjMjJjNTVlIi8+PHRleHQgeD0iMTYiIHk9IjI4IiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiPuKciDwvdGV4dD48L3N2Zz4=',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -34],
  shadowSize: [41, 41],
})

export default function LiveMap({ incidents, selectedIncident }: LiveMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    // Initialize map
    if (!mapRef.current) {
      mapRef.current = L.map('map').setView([39.8283, -98.5795], 4) // Centered on USA

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current)
    }
  }, [])

  // Update markers when incidents change
  useEffect(() => {
    if (!mapRef.current) return

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.removeFrom(mapRef.current!))
    markersRef.current = []

    // Add new markers
    incidents.forEach((incident) => {
      if (incident.latitude && incident.longitude) {
        const icon = incident.accident_detected ? AccidentIcon : SafeIcon
        const marker = L.marker([incident.latitude, incident.longitude], { icon }).addTo(
          mapRef.current!
        )

        // Popup content
        const popupContent = `
          <div class="text-sm">
            <p class="font-semibold">${incident.location}</p>
            <p class="text-xs text-gray-600">${incident.media_type}</p>
            <p class="text-xs font-medium">${incident.accident_detected ? '🚨 Accident' : '✓ Safe'}</p>
            <p class="text-xs">${(incident.confidence * 100).toFixed(0)}% confidence</p>
          </div>
        `
        marker.bindPopup(popupContent)

        markersRef.current.push(marker)
      }
    })
  }, [incidents])

  // Highlight selected incident
  useEffect(() => {
    if (selectedIncident && selectedIncident.latitude && selectedIncident.longitude && mapRef.current) {
      mapRef.current.setView(
        [selectedIncident.latitude, selectedIncident.longitude],
        12,
        { animate: true }
      )
    }
  }, [selectedIncident])

  return <div id="map" className="w-full h-full" />
}
