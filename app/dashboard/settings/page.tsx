'use client'

import { Sidebar, DashboardHeader } from '@/components/dashboard-sidebar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Settings2, Save, RotateCcw } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 md:ml-0">
        <DashboardHeader />

        <main className="p-6 space-y-6 max-w-2xl">
          <div>
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-muted-foreground">
              Configure system preferences and API connections
            </p>
          </div>

          {/* API Configuration */}
          <Card className="border border-border bg-card/70 p-6 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Settings2 className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Backend Configuration</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold mb-2 block">Backend URL</Label>
                <Input
                  defaultValue={process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}
                  readOnly
                  className="bg-muted border-border"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Set NEXT_PUBLIC_BACKEND_URL environment variable to customize
                </p>
              </div>

              <div>
                <Label className="text-sm font-semibold mb-2 block">Backend Status</Label>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium">Connected</span>
                  <Badge variant="outline" className="ml-auto">Ready</Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Detection Settings */}
          <Card className="border border-border bg-card/70 p-6 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <h2 className="text-xl font-semibold">Detection Settings</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold mb-2 block">Confidence Threshold</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="60"
                    className="flex-1"
                  />
                  <span className="text-sm font-semibold w-12 text-right">60%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Minimum confidence level to flag as accident
                </p>
              </div>

              <div className="flex items-center justify-between p-3 bg-card/50 rounded border border-border/50">
                <div>
                  <p className="text-sm font-semibold">Alert Sound</p>
                  <p className="text-xs text-muted-foreground">Enable audio notifications</p>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5" />
              </div>

              <div className="flex items-center justify-between p-3 bg-card/50 rounded border border-border/50">
                <div>
                  <p className="text-sm font-semibold">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">Browser notifications</p>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5" />
              </div>
            </div>
          </Card>

          {/* Model Information */}
          <Card className="border border-border bg-card/70 p-6 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <h2 className="text-xl font-semibold">AI Model Info</h2>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Model Type</span>
                <Badge variant="outline">YOLOv8 / YOLO11</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Supported Input</span>
                <span className="text-sm font-medium">Images, Videos</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Output Classes</span>
                <span className="text-sm font-medium">Vehicle, Accident, Person</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Backend Framework</span>
                <Badge variant="outline">FastAPI</Badge>
              </div>
            </div>
          </Card>

          {/* System Info */}
          <Card className="border border-border bg-card/70 p-6 space-y-4">
            <h2 className="text-xl font-semibold pb-4 border-b border-border">System Info</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frontend Version</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Framework</span>
                <span className="font-medium">Next.js 16 + TypeScript</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">UI Library</span>
                <span className="font-medium">shadcn/ui + Tailwind CSS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Maps</span>
                <span className="font-medium">Leaflet.js</span>
              </div>
            </div>
          </Card>

          {/* Integration Instructions */}
          <Card className="border border-accent/50 bg-accent/10 p-6 space-y-4">
            <h2 className="text-lg font-semibold">FastAPI Backend Integration</h2>
            <div className="text-sm space-y-3 text-muted-foreground">
              <p>
                This frontend connects to a FastAPI backend for YOLO-based accident detection.
              </p>
              <p className="font-semibold text-foreground">Required Endpoints:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>POST /api/detect/image - Detect accidents in images</li>
                <li>POST /api/detect/video - Detect accidents in videos</li>
                <li>GET /api/incidents - List all detected incidents</li>
                <li>GET /api/notifications - Get notifications</li>
                <li>GET /api/health - Backend health check</li>
              </ul>
              <p className="pt-2">
                Set NEXT_PUBLIC_BACKEND_URL to your FastAPI server URL in environment variables.
              </p>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button className="flex gap-2">
              <Save className="w-4 h-4" />
              Save Settings
            </Button>
            <Button variant="outline" className="flex gap-2">
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </Button>
          </div>
        </main>
      </div>
    </div>
  )
}
