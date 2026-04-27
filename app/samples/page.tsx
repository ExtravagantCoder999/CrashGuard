'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Image as ImageIcon,
  Loader,
  Play,
  Video,
} from 'lucide-react'

import { DashboardHeader, Sidebar } from '@/components/dashboard-sidebar'
import { DetectedMediaViewer } from '@/components/detected-media-viewer'
import { LiveCamera } from '@/components/live-camera'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { detectFromFile } from '@/lib/api-client'
import { DetectionResponse } from '@/lib/types'

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
    title: 'CCTV Collision Sample 1',
    description: 'Dataset image labeled with an accident class.',
    type: 'image',
    url: '/samples/accident-01.jpg',
    hasAccident: true,
    confidence: 0.92,
  },
  {
    id: 'sample-2',
    title: 'CCTV Collision Sample 2',
    description: 'Dataset image with accident and vehicle labels.',
    type: 'image',
    url: '/samples/accident-02.jpg',
    hasAccident: true,
    confidence: 0.88,
  },
  {
    id: 'sample-3',
    title: 'CCTV Collision Sample 3',
    description: 'Dataset image with multiple accident labels.',
    type: 'image',
    url: '/samples/accident-03.jpg',
    hasAccident: true,
    confidence: 0.86,
  },
  {
    id: 'sample-4',
    title: 'Vehicle Sample 1',
    description: 'Dataset image labeled with vehicle objects only.',
    type: 'image',
    url: '/samples/vehicle-01.jpg',
    hasAccident: false,
    confidence: 0.18,
  },
  {
    id: 'sample-5',
    title: 'Vehicle Sample 2',
    description: 'Dataset image labeled with vehicle objects only.',
    type: 'image',
    url: '/samples/vehicle-02.jpg',
    hasAccident: false,
    confidence: 0.12,
  },
  {
    id: 'sample-6',
    title: 'Vehicle Sample 3',
    description: 'Dataset image labeled with a vehicle object only.',
    type: 'image',
    url: '/samples/vehicle-03.jpg',
    hasAccident: false,
    confidence: 0.1,
  },
]

export default function SamplesPage() {
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [sampleResult, setSampleResult] = useState<DetectionResponse | null>(null)
  const [sampleError, setSampleError] = useState('')
  const [showLiveCamera, setShowLiveCamera] = useState(false)

  const { toast } = useToast()

  const openSample = (sample: Sample) => {
    setSelectedSample(sample)
    setSampleResult(null)
    setSampleError('')
    setIsDialogOpen(true)
  }

  const handleAnalyzeSample = async (sample: Sample) => {
    setIsAnalyzing(true)
    setSampleError('')
    setSampleResult(null)

    try {
      const response = await fetch(sample.url)

      if (!response.ok) {
        throw new Error(`Could not load ${sample.url} for analysis.`)
      }

      const blob = await response.blob()
      const file = new File([blob], `${sample.id}.jpg`, {
        type: blob.type || 'image/jpeg',
      })
      const result = await detectFromFile(file, sample.type)

      setSampleResult(result)
      toast({
        title: result.accident_detected ? 'Accident Detected' : 'Detection Complete',
        description: `${sample.title} returned ${(result.confidence * 100).toFixed(
          0
        )}% accident confidence.`,
        variant: result.accident_detected ? 'destructive' : 'default',
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Sample analysis failed. Please try again.'

      setSampleError(message)
      toast({
        title: 'Sample Analysis Failed',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsAnalyzing(false)
    }
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
                  onClick={() => openSample(sample)}
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
                        openSample(sample)
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
                  {isAnalyzing ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze This Sample'
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Close
                </Button>
              </div>

              {sampleError ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{sampleError}</AlertDescription>
                </Alert>
              ) : null}

              {sampleResult ? (
                <Card className="border border-border bg-card/70 p-4">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <p className="font-semibold">Backend Detection Result</p>
                    </div>
                    <Badge
                      className={
                        sampleResult.accident_detected
                          ? 'border-destructive/50 bg-destructive/20 text-destructive'
                          : 'border-green-500/50 bg-green-500/20 text-green-400'
                      }
                      variant="outline"
                    >
                      {sampleResult.accident_detected ? 'Accident' : 'No Accident'}
                    </Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Confidence</p>
                      <p className="font-semibold">
                        {(sampleResult.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Detections</p>
                      <p className="font-semibold">{sampleResult.detections.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Media Type</p>
                      <p className="font-semibold capitalize">{sampleResult.media_type}</p>
                    </div>
                  </div>

                  {sampleResult.detections.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      {sampleResult.detections.slice(0, 5).map((detection, index) => (
                        <div
                          key={`${detection.label}-${index}`}
                          className="flex items-center justify-between rounded border border-border/50 bg-card/50 p-2 text-sm"
                        >
                          <span className="capitalize">{detection.label}</span>
                          <Badge variant="outline">
                            {(detection.score * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4">
                    <DetectedMediaViewer
                      buttonLabel="View Annotated Sample"
                      description="This is the annotated output returned by the FastAPI backend."
                      fallbackUrl={sampleResult.annotated_media_download_url ?? null}
                      initialOpen={sampleResult.accident_detected}
                      mediaType={sampleResult.media_type}
                      mediaUrl={sampleResult.annotated_media_url ?? null}
                      title="Detected Sample Output"
                      warning={sampleResult.annotated_media_warning}
                    />
                  </div>
                </Card>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
