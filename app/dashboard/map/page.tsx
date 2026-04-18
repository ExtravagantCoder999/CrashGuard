'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Sidebar, DashboardHeader } from '@/components/dashboard-sidebar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getIncidents } from '@/lib/api-client'
import { Incident } from '@/lib/types'
import { MapPin, AlertTriangle } from 'lucide-react'

// Dynamically import map to avoid SSR issues
const MapComponent = dynamic(() => import('@/components/live-map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-card/50 flex items-center justify-center text-muted-foreground">
      Loading map...
    </div>
  ),
})

export default function LiveMapPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const data = await getIncidents()
        setIncidents(data)
        if (data.length > 0) {
          setSelectedIncident(data[0])
        }
      } catch (error) {
        console.error('Failed to fetch incidents:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchIncidents()
  }, [])

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 md:ml-0">
        <DashboardHeader />

        <div className="flex flex-col lg:flex-row gap-6 p-6 h-[calc(100vh-120px)] overflow-hidden">
          {/* Map */}
          <div className="flex-1 rounded-lg border border-border overflow-hidden">
            <MapComponent incidents={incidents} selectedIncident={selectedIncident} />
          </div>

          {/* Incident List */}
          <div className="w-full lg:w-80 flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-bold mb-1">Recent Incidents</h2>
              <p className="text-sm text-muted-foreground">
                {incidents.length} detected on map
              </p>
            </div>

            {loading ? (
              <Card className="p-4 text-center text-muted-foreground">
                Loading incidents...
              </Card>
            ) : incidents.length === 0 ? (
              <Card className="p-6 text-center flex-1 flex flex-col items-center justify-center">
                <MapPin className="w-12 h-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No incidents to display</p>
              </Card>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2">
                {incidents.map((incident) => (
                  <Card
                    key={incident.id}
                    onClick={() => setSelectedIncident(incident)}
                    className={`p-4 cursor-pointer transition-all border ${
                      selectedIncident?.id === incident.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm truncate">
                          {incident.location}
                        </p>
                        <Badge
                          className={
                            incident.accident_detected
                              ? 'bg-destructive/20 text-destructive border-destructive/50'
                              : 'bg-green-500/20 text-green-400 border-green-500/50'
                          }
                          variant="outline"
                        >
                          {incident.accident_detected ? 'Accident' : 'Safe'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Confidence</p>
                          <p className="font-semibold">
                            {(incident.confidence * 100).toFixed(0)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Type</p>
                          <p className="font-semibold capitalize">{incident.media_type}</p>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {new Date(incident.timestamp).toLocaleTimeString()}
                      </p>

                      {incident.status === 'critical' && (
                        <div className="flex items-center gap-2 mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
                          <AlertTriangle className="w-3 h-3" />
                          Requires attention
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
