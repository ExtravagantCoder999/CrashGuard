'use client'

import { useEffect, useState } from 'react'
import { Sidebar, DashboardHeader } from '@/components/dashboard-sidebar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Bell, AlertTriangle, Info } from 'lucide-react'
import { getNotifications } from '@/lib/api-client'
import { Notification } from '@/lib/types'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'critical' | 'recent'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await getNotifications()
        setNotifications(data.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ))
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [])

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'critical':
        return notifications.filter((n) => n.severity === 'critical')
      case 'recent':
        return notifications.slice(0, 10)
      default:
        return notifications
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-destructive/20 text-destructive border-destructive/50'
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5" />
      case 'warning':
        return <Bell className="w-5 h-5" />
      default:
        return <Info className="w-5 h-5" />
    }
  }

  const filteredNotifications = getFilteredNotifications()

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 md:ml-0">
        <DashboardHeader />

        <main className="p-6 space-y-6 max-w-4xl">
          <div>
            <h1 className="text-3xl font-bold mb-2">Notifications</h1>
            <p className="text-muted-foreground">
              View alerts and notifications for detected incidents
            </p>
          </div>

          {/* Filter Tabs */}
          <Tabs defaultValue="all" onValueChange={(v) => setFilter(v as any)}>
            <TabsList className="grid w-full grid-cols-3 bg-card/50 border border-border">
              <TabsTrigger value="all">
                All
                <Badge variant="outline" className="ml-2">
                  {notifications.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="critical">
                Critical
                <Badge variant="outline" className="ml-2">
                  {notifications.filter((n) => n.severity === 'critical').length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="recent">
                Recent
                <Badge variant="outline" className="ml-2">
                  {Math.min(10, notifications.length)}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="space-y-4 mt-6">
              {loading ? (
                <Card className="p-8 text-center text-muted-foreground">
                  Loading notifications...
                </Card>
              ) : filteredNotifications.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No notifications to display</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => (
                    <Card
                      key={notification.id}
                      className={`p-4 border transition-colors cursor-pointer hover:bg-card/70 ${
                        !notification.read
                          ? 'border-primary/50 bg-card/70'
                          : 'border-border bg-card/50'
                      }`}
                    >
                      <div className="flex gap-4">
                        {/* Icon */}
                        <div
                          className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                            notification.severity === 'critical'
                              ? 'bg-destructive/20 text-destructive'
                              : notification.severity === 'warning'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {getSeverityIcon(notification.severity)}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-1">
                            <h3 className="font-semibold">{notification.title}</h3>
                            <Badge
                              className={getSeverityColor(notification.severity)}
                              variant="outline"
                            >
                              {notification.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(notification.timestamp).toLocaleString()}
                          </p>
                        </div>

                        {/* Unread indicator */}
                        {!notification.read && (
                          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
