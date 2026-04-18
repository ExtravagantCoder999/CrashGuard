'use client'

import {
  ChangeEvent,
  DragEvent,
  MutableRefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ImageIcon,
  Loader,
  Upload,
  Video,
} from 'lucide-react'

import {
  CameraCapture,
  CameraCapturedMedia,
} from '@/components/camera-capture'
import { DashboardHeader, Sidebar } from '@/components/dashboard-sidebar'
import { DetectedMediaViewer } from '@/components/detected-media-viewer'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { detectFromFile } from '@/lib/api-client'
import { DetectionResponse } from '@/lib/types'

type UploadMode = 'upload' | 'camera'

interface SelectedMedia {
  file: File
  label: string
  mediaType: 'image' | 'video'
  previewUrl: string
}

function getSelectedMediaType(file: File): 'image' | 'video' | null {
  if (file.type.startsWith('image/')) {
    return 'image'
  }

  if (file.type.startsWith('video/')) {
    return 'video'
  }

  const extension = file.name.split('.').pop()?.toLowerCase()

  if (
    extension &&
    ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)
  ) {
    return 'image'
  }

  if (
    extension &&
    ['mp4', 'mov', 'webm', 'avi', 'm4v', 'mkv'].includes(extension)
  ) {
    return 'video'
  }

  return null
}

export default function UploadPage() {
  const [mode, setMode] = useState<UploadMode>('upload')
  const [uploadedMedia, setUploadedMedia] = useState<SelectedMedia | null>(null)
  const [cameraMedia, setCameraMedia] = useState<SelectedMedia | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DetectionResponse | null>(null)
  const [error, setError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadPreviewUrlRef = useRef<string | null>(null)
  const cameraPreviewUrlRef = useRef<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    audioRef.current = new Audio('/alert-sound.mp3')
  }, [])

  useEffect(() => {
    return () => {
      if (uploadPreviewUrlRef.current) {
        URL.revokeObjectURL(uploadPreviewUrlRef.current)
      }

      if (cameraPreviewUrlRef.current) {
        URL.revokeObjectURL(cameraPreviewUrlRef.current)
      }
    }
  }, [])

  const activeMedia = useMemo(
    () => (mode === 'upload' ? uploadedMedia : cameraMedia),
    [cameraMedia, mode, uploadedMedia]
  )

  const clearResult = () => {
    setResult(null)
    setError('')
  }

  const showError = (message: string) => {
    setError(message)
    toast({
      title: 'Error',
      description: message,
      variant: 'destructive',
    })
  }

  const replacePreviewUrl = (
    previewRef: React.MutableRefObject<string | null>,
    newUrl: string
  ) => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current)
    }

    previewRef.current = newUrl
  }

  const handleUploadSelection = (file: File) => {
    const mediaType = getSelectedMediaType(file)

    if (!mediaType) {
      showError('Please select an image or video file.')
      return
    }

    const previewUrl = URL.createObjectURL(file)
    replacePreviewUrl(uploadPreviewUrlRef, previewUrl)

    setUploadedMedia({
      file,
      label: mediaType === 'image' ? 'uploaded image' : 'uploaded video',
      mediaType,
      previewUrl,
    })

    clearResult()
  }

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (file) {
      handleUploadSelection(file)
    }
  }

  const handleDrag = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true)
    } else if (event.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)

    const file = event.dataTransfer.files?.[0]

    if (file) {
      handleUploadSelection(file)
    }
  }

  const handleCameraMediaReady = (media: CameraCapturedMedia) => {
    replacePreviewUrl(cameraPreviewUrlRef, media.previewUrl)

    setCameraMedia({
      file: media.file,
      label: media.label,
      mediaType: media.mediaType,
      previewUrl: media.previewUrl,
    })

    clearResult()

    toast({
      title:
        media.mediaType === 'image'
          ? 'Image Captured'
          : 'Video Recorded',
      description:
        media.mediaType === 'image'
          ? 'Your captured image is ready for detection.'
          : 'Your recorded video is ready for detection.',
    })
  }

  const handleRunDetection = async () => {
    if (!activeMedia) {
      showError(
        mode === 'upload'
          ? 'Please select an image or video before running detection.'
          : 'Please capture an image or record a video before running detection.'
      )
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const detectionResult = await detectFromFile(
        activeMedia.file,
        activeMedia.mediaType
      )
      setResult(detectionResult)

      if (detectionResult.accident_detected) {
        try {
          if (audioRef.current) {
            audioRef.current.currentTime = 0
            await audioRef.current.play()
          }
        } catch (playbackError) {
          console.warn('Could not play alert sound:', playbackError)
        }

        toast({
          title: 'Accident Detected',
          description: `Critical accident detected with ${(
            detectionResult.confidence * 100
          ).toFixed(0)}% confidence at ${detectionResult.location}.`,
          variant: 'destructive',
        })
      }
    } catch (detectionError) {
      showError(
        detectionError instanceof Error
          ? detectionError.message
          : 'Detection failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const clearUploadedMedia = () => {
    setUploadedMedia(null)
    clearResult()

    if (uploadPreviewUrlRef.current) {
      URL.revokeObjectURL(uploadPreviewUrlRef.current)
      uploadPreviewUrlRef.current = null
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const clearCameraMedia = () => {
    setCameraMedia(null)
    clearResult()

    if (cameraPreviewUrlRef.current) {
      URL.revokeObjectURL(cameraPreviewUrlRef.current)
      cameraPreviewUrlRef.current = null
    }
  }

  const previewTitle = result?.media_type === 'video' ? 'Detected Footage' : 'Detected Image'
  const previewDescription =
    result?.media_type === 'video'
      ? 'This is the annotated footage generated by the detector.'
      : 'This is the annotated image generated by the detector.'
  const previewButtonLabel =
    result?.media_type === 'video' ? 'View Footage' : 'View Image'

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 md:ml-0">
        <DashboardHeader />

        <main className="max-w-5xl space-y-6 p-6">
          <div>
            <h1 className="mb-2 text-3xl font-bold">Upload Media</h1>
            <p className="text-muted-foreground">
              Upload an image or video from your device, or use the browser camera to
              capture a photo or record a video for detection.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs
            value={mode}
            onValueChange={(value) => {
              setMode(value as UploadMode)
              setError('')
            }}
            className="space-y-6"
          >
            <TabsList className="grid w-full max-w-md grid-cols-2 border border-border bg-card">
              <TabsTrigger value="upload">
                <Upload className="mr-2 h-4 w-4" />
                Upload Media
              </TabsTrigger>
              <TabsTrigger value="camera">
                <Camera className="mr-2 h-4 w-4" />
                Use Camera
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <Card
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed p-10 text-center transition-all ${
                  dragActive
                    ? 'border-primary bg-primary/10'
                    : 'border-border/60 hover:border-border'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileInput}
                  className="hidden"
                />

                {uploadedMedia ? (
                  <div className="space-y-3">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <CheckCircle2 className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{uploadedMedia.file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(uploadedMedia.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                    >
                      Choose Another File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-card">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">Upload an image or video</p>
                      <p className="text-sm text-muted-foreground">
                        Drag and drop a file here, or browse your files.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Select Image or Video
                    </Button>
                  </div>
                )}
              </Card>

              {uploadedMedia && (
                <>
                  <Card className="overflow-hidden border border-border">
                    <div className="border-b border-border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">Selected Media Preview</p>
                        <Badge variant="outline" className="capitalize">
                          {uploadedMedia.label}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-center bg-black/30 p-4">
                      {uploadedMedia.mediaType === 'image' ? (
                        <img
                          src={uploadedMedia.previewUrl}
                          alt="Selected upload preview"
                          className="max-h-96 max-w-full rounded object-contain"
                        />
                      ) : (
                        <video
                          src={uploadedMedia.previewUrl}
                          controls
                          className="max-h-96 max-w-full rounded object-contain"
                        />
                      )}
                    </div>
                    <div className="border-t border-border p-4 text-sm text-muted-foreground">
                      {uploadedMedia.mediaType === 'image'
                        ? 'This local image will be sent to POST /api/detect/image.'
                        : 'This local video will be sent to POST /api/detect/video.'}
                    </div>
                  </Card>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      type="button"
                      onClick={handleRunDetection}
                      disabled={loading}
                      className="flex-1"
                      size="lg"
                    >
                      {loading ? (
                        <>
                          <Loader className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Run Detection'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={clearUploadedMedia}
                      disabled={loading}
                      size="lg"
                    >
                      Clear
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="camera" className="space-y-4">
              <CameraCapture
                disabled={loading}
                onError={setError}
                onMediaReady={handleCameraMediaReady}
              />

              {cameraMedia && (
                <>
                  <Card className="overflow-hidden border border-border">
                    <div className="border-b border-border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">Current Camera Input</p>
                        <Badge variant="outline" className="capitalize">
                          {cameraMedia.label}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex h-[20rem] items-center justify-center bg-black/30 p-4 sm:h-[24rem]">
                      {cameraMedia.mediaType === 'image' ? (
                        <img
                          src={cameraMedia.previewUrl}
                          alt="Captured image preview"
                          className="h-full max-w-full rounded object-contain"
                        />
                      ) : (
                        <video
                          src={cameraMedia.previewUrl}
                          controls
                          className="h-full max-w-full rounded object-contain"
                        />
                      )}
                    </div>
                    <div className="border-t border-border p-4 text-sm text-muted-foreground">
                      {cameraMedia.mediaType === 'image'
                        ? 'This captured image will be sent to POST /api/detect/image.'
                        : 'This recorded video will be sent to POST /api/detect/video.'}
                    </div>
                  </Card>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      type="button"
                      onClick={handleRunDetection}
                      disabled={loading}
                      className="flex-1"
                      size="lg"
                    >
                      {loading ? (
                        <>
                          <Loader className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Run Detection'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={clearCameraMedia}
                      disabled={loading}
                      size="lg"
                    >
                      Clear
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>

          {result && (
            <Card className="border border-border">
              <div className="border-b border-border p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-2xl font-bold">Detection Result</h2>
                  <Badge
                    className={
                      result.accident_detected
                        ? 'min-w-[10.5rem] justify-center border-destructive/50 bg-destructive/20 text-destructive'
                        : 'min-w-[10.5rem] justify-center border-green-500/50 bg-green-500/20 text-green-400'
                    }
                    variant="outline"
                  >
                    {result.accident_detected ? 'Accident Detected' : 'No Accident'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-6 p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="min-h-24 rounded-lg border border-border/50 bg-card/50 p-4">
                    <p className="text-sm text-muted-foreground">Confidence</p>
                    <p className="w-[7ch] font-mono text-3xl font-bold tabular-nums">
                      {(result.confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="min-h-24 rounded-lg border border-border/50 bg-card/50 p-4">
                    <p className="text-sm text-muted-foreground">Media Type</p>
                    <div className="flex items-center gap-2">
                      {result.media_type === 'video' ? (
                        <Video className="h-5 w-5 text-primary" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-primary" />
                      )}
                      <p className="min-w-[5.5rem] text-2xl font-semibold capitalize">
                        {result.media_type}
                      </p>
                    </div>
                  </div>
                  <div className="min-h-24 rounded-lg border border-border/50 bg-card/50 p-4">
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="min-h-[1.75rem] text-lg font-semibold leading-7">
                      {result.location}
                    </p>
                  </div>
                  <div className="min-h-24 rounded-lg border border-border/50 bg-card/50 p-4">
                    <p className="text-sm text-muted-foreground">Timestamp</p>
                    <p className="min-w-[15ch] whitespace-nowrap font-mono text-lg font-semibold tabular-nums">
                      {new Date(result.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-sm font-semibold">Detections</p>
                  {result.detections.length > 0 ? (
                    <div className="space-y-2">
                      {result.detections.map((detection, index) => (
                        <div
                          key={`${detection.label}-${index}`}
                          className="grid grid-cols-[minmax(0,1fr)_8.5rem] items-center gap-3 rounded border border-border/50 bg-card/50 p-3"
                        >
                          <span className="min-w-0 truncate capitalize">
                            {detection.label}
                          </span>
                          <Badge variant="outline" className="justify-center">
                            {(detection.score * 100).toFixed(0)}% confidence
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No detections were returned for this media.
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {result.media_type === 'video' && !result.annotated_media_url ? (
                    <p className="flex-1 text-sm text-muted-foreground">
                      No annotated footage preview available.
                    </p>
                  ) : (
                    <DetectedMediaViewer
                      initialOpen={result.accident_detected}
                      mediaType={result.media_type}
                      mediaUrl={result.annotated_media_url ?? null}
                      title={previewTitle}
                      description={previewDescription}
                      buttonLabel={previewButtonLabel}
                    />
                  )}

                  <Button type="button" variant="ghost" onClick={() => setResult(null)}>
                    Clear Result
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}
