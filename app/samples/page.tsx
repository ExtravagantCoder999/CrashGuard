'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Image as ImageIcon, Play, Video } from 'lucide-react'

import { DashboardHeader, Sidebar } from '@/components/dashboard-sidebar'
import { LiveCamera } from '@/components/live-camera'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface Sample {
  confidence: number
  description: string
  hasAccident: boolean
  id: string
  title: string
  type: 'image' | 'video'
  url: string
}

const SAMPLES: Sample[] = [
  {
    id: 'sample-1',
    title: 'Highway Collision - Exit 45',
    description: 'Multi-vehicle collision on highway during peak traffic',
    type: 'video',
    url: '/samples/collision-highway.mp4',
    hasAccident: true,
    confidence: 0.92,
  },
  {
    id: 'sample-2',
    title: 'Intersection Rear-End',
    description: 'Two-car rear-end collision at urban intersection',
    type: 'image',
    url: '/samples/collision-intersection.jpg',
    hasAccident: true,
    confidence: 0.88,
  },
  {
    id: 'sample-3',
    title: 'Urban Traffic Flow',
    description: 'Normal traffic conditions with no accidents',
    type: 'video',
    url: '/samples/traffic-normal.mp4',
    hasAccident: false,
    confidence: 0.05,
  },
  {
    id: 'sample-4',
    title: 'Parking Lot Incident',
    description: 'Minor collision in a parking area',
    type: 'image',
    url: '/samples/collision-parking.jpg',
    hasAccident: true,
    confidence: 0.75,
  },
  {
    id: 'sample-5',
    title: 'Highway Normal Traffic',
    description: 'Regular highway conditions without incidents',
    type: 'video',
    url: '/samples/traffic-highway.mp4',
    hasAccident: false,
    confidence: 0.03,
  },
  {
    id: 'sample-6',
    title: 'Urban Intersection Normal',
    description: 'Standard intersection traffic with no accidents',
    type: 'image',
    url: '/samples/traffic-intersection.jpg',
    hasAccident: false,
    confidence: 0.02,
  },
]

export default function SamplesPage() {
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showLiveCamera, setShowLiveCamera] = useState(false)

  const router = useRouter()
  const { toast } = useToast()

  const handleAnalyzeSample = (sample: Sample) => {
    setIsAnalyzing(true)

    setTimeout(() => {
      toast({
        title: 'Sample Ready',
        description: `Open the Upload page to test "${sample.title}" through the detection flow.`,
      })
      setIsAnalyzing(false)
      setIsDialogOpen(false)
      router.push('/dashboard/upload')
    }, 1200)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 md:ml-0">
        <DashboardHeader />

        <main className="space-y-8 p-6">
          <div>
            <h1 className="mb-2 text-3xl font-bold">CCTV Sample Gallery</h1>
            <p className="text-muted-foreground">
              Preview demo samples and run continuous live detection from your laptop
              or phone camera in the browser.
            </p>
          </div>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card/50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">CCTV Live Video</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start the browser camera, then enable real-time frame detection for
                  vehicles and accidents.
                </p>
              </div>

              {!showLiveCamera && (
                <Button type="button" onClick={() => setShowLiveCamera(true)}>
                  <Play className="mr-2 h-4 w-4" />
                  Open Live Camera
                </Button>
              )}
            </div>

            {showLiveCamera && (
              <div className="space-y-4">
                <LiveCamera detectionIntervalMs={1000} />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowLiveCamera(false)}
                  className="w-full"
                >
                  Close Live Camera
                </Button>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Sample Footage</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse still images and videos that match the CCTV dashboard theme.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {SAMPLES.map((sample) => (
                <Card
                  key={sample.id}
                  className="group cursor-pointer overflow-hidden border border-border transition-all hover:border-primary/50 hover:shadow-lg"
                  onClick={() => {
                    setSelectedSample(sample)
                    setIsDialogOpen(true)
                  }}
                >
                  <div className="relative aspect-video overflow-hidden bg-black/40">
                    {sample.type === 'video' ? (
                      <video
                        src={sample.url}
                        muted
                        playsInline
                        className="h-full w-full object-cover opacity-80"
                      />
                    ) : (
                      <img
                        src={sample.url}
                        alt={sample.title}
                        className="h-full w-full object-cover opacity-80"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <Badge className="absolute right-3 top-3 capitalize" variant="outline">
                      {sample.type}
                    </Badge>
                  </div>

                  <div className="space-y-3 p-4">
                    <div>
                      <h3 className="text-sm font-semibold line-clamp-2">{sample.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {sample.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge
                        className={
                          sample.hasAccident
                            ? 'border-destructive/50 bg-destructive/20 text-destructive'
                            : 'border-green-500/50 bg-green-500/20 text-green-400'
                        }
                        variant="outline"
                      >
                        {sample.hasAccident ? 'Accident' : 'Normal'}
                      </Badge>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {(sample.confidence * 100).toFixed(0)}%
                      </span>
                    </div>

                    <Button
                      type="button"
                      className="w-full"
                      onClick={(event) => {
                        event.stopPropagation()
                        setSelectedSample(sample)
                        setIsDialogOpen(true)
                      }}
                    >
                      View Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </main>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl border border-border bg-card">
          <DialogHeader>
            <DialogTitle>{selectedSample?.title}</DialogTitle>
          </DialogHeader>

          {selectedSample && (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-lg border border-border bg-black/40">
                {selectedSample.type === 'video' ? (
                  <video
                    src={selectedSample.url}
                    controls
                    className="max-h-[50vh] w-full bg-black object-contain"
                  />
                ) : (
                  <img
                    src={selectedSample.url}
                    alt={selectedSample.title}
                    className="max-h-[50vh] w-full object-contain"
                  />
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{selectedSample.description}</p>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <div className="mt-1 flex items-center gap-2">
                      {selectedSample.type === 'video' ? (
                        <Video className="h-4 w-4 text-primary" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-primary" />
                      )}
                      <p className="font-semibold capitalize">{selectedSample.type}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="mt-1 font-semibold">
                      {selectedSample.hasAccident ? 'Accident' : 'Normal'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Confidence</p>
                    <p className="mt-1 font-semibold">
                      {(selectedSample.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => handleAnalyzeSample(selectedSample)}
                  disabled={isAnalyzing}
                  className="flex-1"
                >
                  {isAnalyzing ? 'Preparing...' : 'Analyze This Sample'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
