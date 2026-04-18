'use client'

import { useEffect, useState } from 'react'
import { Sidebar, DashboardHeader } from '@/components/dashboard-sidebar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, Activity, Clock, TrendingUp } from 'lucide-react'
import { getDashboardStats, getIncidents, getNotifications } from '@/lib/api-client'
import { Incident, Notification } from '@/lib/types'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalUploads: 0,
    accidentsDetected: 0,
    pendingReviews: 0,
    lastDetectionTime: null as string | null,
  })
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, incidentsData, notificationsData] = await Promise.all([
          getDashboardStats(),
          getIncidents(),
          getNotifications(),
        ])
        setStats(statsData)
        setIncidents(incidentsData)
        setNotifications(notificationsData)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 md:ml-0">
        <DashboardHeader />

        {/* Main Content */}
        <main className="p-6 space-y-6">
          {/* Critical Alerts */}
          {notifications.some((n) => n.severity === 'critical' && !n.read) && (
            <Alert className="border-destructive/50 bg-destructive/10 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Critical Alert</AlertTitle>
              <AlertDescription>
                {
                  notifications.filter((n) => n.severity === 'critical' && !n.read)
                    .length
                }{' '}
                new accident detection(s) require attention
              </AlertDescription>
            </Alert>
          )}

          {/* Stats Grid */}
          <div className="grid md:grid-cols-4 gap-4">
            {/* Total Uploads */}
            <Card className="p-6 border border-border bg-card/70">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Total Uploads</p>
                  <p className="text-3xl font-bold">{stats.totalUploads}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
              </div>
            </Card>

            {/* Accidents Detected */}
            <Card className="p-6 border border-border bg-card/70">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Accidents Detected</p>
                  <p className="text-3xl font-bold text-destructive">{stats.accidentsDetected}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
              </div>
            </Card>

            {/* Pending Reviews */}
            <Card className="p-6 border border-border bg-card/70">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Pending Reviews</p>
                  <p className="text-3xl font-bold">{stats.pendingReviews}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-accent" />
                </div>
              </div>
            </Card>

            {/* Last Detection */}
            <Card className="p-6 border border-border bg-card/70">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Last Detection</p>
                  <p className="text-lg font-bold">{formatTime(stats.lastDetectionTime)}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Detections Table */}
          <Card className="border border-border bg-card/70">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold">Recent Detections</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 font-semibold text-sm">Location</th>
                    <th className="text-left p-4 font-semibold text-sm">Type</th>
                    <th className="text-left p-4 font-semibold text-sm">Confidence</th>
                    <th className="text-left p-4 font-semibold text-sm">Status</th>
                    <th className="text-left p-4 font-semibold text-sm">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.slice(0, 5).map((incident) => (
                    <tr
                      key={incident.id}
                      className="border-b border-border/50 hover:bg-card/50 transition-colors"
                    >
                      <td className="p-4 text-sm">{incident.location}</td>
                      <td className="p-4 text-sm">
                        <Badge variant="outline">{incident.media_type}</Badge>
                      </td>
                      <td className="p-4 text-sm">
                        {(incident.confidence * 100).toFixed(0)}%
                      </td>
                      <td className="p-4 text-sm">
                        <Badge
                          className={
                            incident.accident_detected
                              ? 'bg-destructive/20 text-destructive border-destructive/50'
                              : 'bg-green-500/20 text-green-400 border-green-500/50'
                          }
                          variant="outline"
                        >
                          {incident.accident_detected ? 'Accident' : 'No Accident'}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(incident.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {incidents.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No detections yet. Upload media to start detecting accidents.
                </div>
              )}
            </div>
          </Card>

          {/* Recent Incidents on the Side */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2" />
            <Card className="border border-border bg-card/70">
              <div className="p-6 border-b border-border">
                <h3 className="font-semibold">Recent Incidents</h3>
              </div>
              <div className="divide-y divide-border/50 max-h-96 overflow-y-auto">
                {incidents.slice(0, 4).map((incident) => (
                  <div key={incident.id} className="p-4 hover:bg-card/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium truncate">
                          {incident.location}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(incident.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <Badge
                        className={
                          incident.status === 'critical'
                            ? 'bg-destructive/20 text-destructive'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }
                        variant="outline"
                      >
                        {incident.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {incidents.length === 0 && (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No incidents
                  </div>
                )}
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
