'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Camera, Eye, EyeOff, Loader, Play, Square } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { CctvVideoOverlay } from '@/components/cctv-video-overlay'
import { DetectedMediaViewer } from '@/components/detected-media-viewer'
import {
  DetectionHistoryEntry,
  RecentDetectionHistory,
} from '@/components/recent-detection-history'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { detectFromFile, resolveBackendMediaUrl } from '@/lib/api-client'
import { DetectionResponse } from '@/lib/types'

interface LiveCameraProps {
  detectionIntervalMs?: number
  onDetectionResult?: (result: DetectionResponse) => void
  onError?: (error: string) => void
}

const MEANINGFUL_CONFIDENCE_THRESHOLD = 0.3
const ALERT_DEBOUNCE_MS = 10000
const DUPLICATE_HISTORY_WINDOW_MS = 8000
const MEANINGFUL_LABELS = new Set([
  'accident',
  'bicycle',
  'bus',
  'car',
  'motorbike',
  'motorcycle',
  'truck',
  'vehicle',
])

function getCameraErrorMessage(error: unknown): string {
  if (!(error instanceof DOMException)) {
    return error instanceof Error ? error.message : 'Failed to access the camera.'
  }

  switch (error.name) {
    case 'NotAllowedError':
      return 'Camera permission was denied. Please allow camera access in your browser settings.'
    case 'NotFoundError':
      return 'No camera was found on this device.'
    case 'NotReadableError':
      return 'The camera is busy or unavailable because another app is using it.'
    case 'OverconstrainedError':
      return 'The requested camera settings are not supported on this device.'
    default:
      return error.message || 'Failed to access the camera.'
  }
}

function getDetectionSignature(result: DetectionResponse): string {
  const labels = result.detections
    .map((detection) => detection.label.toLowerCase())
    .sort()
    .join('|')

  return `${result.accident_detected ? 'accident' : 'normal'}:${labels}`
}

function getMeaningfulDetections(result: DetectionResponse) {
  return result.detections.filter((detection) => {
    const label = detection.label.toLowerCase()

    return (
      MEANINGFUL_LABELS.has(label) &&
      detection.score >= MEANINGFUL_CONFIDENCE_THRESHOLD
    )
  })
}

function getHighestDetectionConfidence(result: DetectionResponse): number {
  if (result.detections.length === 0) {
    return result.confidence
  }

  return Math.max(
    result.confidence,
    ...result.detections.map((detection) => detection.score)
  )
}

function hasMeaningfulDetection(result: DetectionResponse): boolean {
  if (result.accident_detected) {
    return true
  }

  const meaningfulDetections = getMeaningfulDetections(result)

  if (meaningfulDetections.length === 0) {
    return false
  }

  return getHighestDetectionConfidence({
    ...result,
    detections: meaningfulDetections,
  }) >= MEANINGFUL_CONFIDENCE_THRESHOLD
}

function buildDisplayResult(result: DetectionResponse): DetectionResponse {
  const meaningfulDetections = getMeaningfulDetections(result)

  if (result.accident_detected && meaningfulDetections.length === 0) {
    return {
      ...result,
      detections: [
        {
          label: 'accident',
          score: result.confidence,
          box: [0, 0, 0, 0],
        },
      ],
    }
  }

  if (meaningfulDetections.length === result.detections.length) {
    return result
  }

  return {
    ...result,
    confidence:
      meaningfulDetections.length > 0
        ? Math.max(
            result.confidence,
            ...meaningfulDetections.map((detection) => detection.score)
          )
        : result.confidence,
    detections: meaningfulDetections,
  }
}

export function LiveCamera({
  detectionIntervalMs = 1000,
  onDetectionResult,
  onError,
}: LiveCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const detectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const requestInFlightRef = useRef(false)
  const detectionEnabledRef = useRef(false)
  const autoStartDetectionRef = useRef(false)
  const lastAlertTimestampRef = useRef(0)
  const lastAlertSignatureRef = useRef('')
  const lastHistorySignatureRef = useRef('')
  const lastHistoryTimestampRef = useRef(0)

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isStartingCamera, setIsStartingCamera] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [isProcessingFrame, setIsProcessingFrame] = useState(false)
  const [error, setError] = useState('')
  const [latestResult, setLatestResult] = useState<DetectionResponse | null>(null)
  const [history, setHistory] = useState<DetectionHistoryEntry[]>([])
  const [overlayTimestamp, setOverlayTimestamp] = useState('')

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    audioRef.current = new Audio('/alert-sound.mp3')
  }, [])

  useEffect(() => {
    const updateTimestamp = () => {
      setOverlayTimestamp(
        new Date().toLocaleString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
      )
    }

    updateTimestamp()

    const interval = setInterval(updateTimestamp, 1000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!stream || !videoRef.current) {
      return
    }

    const videoElement = videoRef.current
    videoElement.srcObject = stream

    const playStream = async () => {
      try {
        await videoElement.play()
      } catch (playError) {
        const message =
          playError instanceof Error
            ? playError.message
            : 'The live camera preview could not start.'

        setError(message)
        onError?.(message)
      }
    }

    void playStream()
  }, [onError, stream])

  useEffect(() => {
    if (!stream || !autoStartDetectionRef.current) {
      return
    }

    autoStartDetectionRef.current = false
    void startDetection(true)
  }, [stream])

  useEffect(() => {
    return () => {
      detectionEnabledRef.current = false

      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
      }

      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stream])

  const resolvedAnnotatedMediaUrl = useMemo(
    () => resolveBackendMediaUrl(latestResult?.annotated_media_url),
    [latestResult?.annotated_media_url]
  )

  const stopDetection = () => {
    detectionEnabledRef.current = false
    autoStartDetectionRef.current = false

    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }

    requestInFlightRef.current = false
    setIsDetecting(false)
    setIsProcessingFrame(false)
  }

  const stopCamera = () => {
    stopDetection()

    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setStream(null)
    setIsStartingCamera(false)
  }

  const startCamera = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const message = 'This browser does not support camera access.'
      setError(message)
      onError?.(message)
      return
    }

    setIsStartingCamera(true)
    setError('')
    autoStartDetectionRef.current = true

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      setStream(mediaStream)
    } catch (cameraError) {
      autoStartDetectionRef.current = false
      const message = getCameraErrorMessage(cameraError)
      setError(message)
      onError?.(message)
    } finally {
      setIsStartingCamera(false)
    }
  }

  const captureFrameFile = async (): Promise<File | null> => {
    if (!videoRef.current || !canvasRef.current) {
      return null
    }

    const videoElement = videoRef.current

    if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      return null
    }

    const canvasElement = canvasRef.current
    const context = canvasElement.getContext('2d')

    if (!context) {
      return null
    }

    canvasElement.width = videoElement.videoWidth
    canvasElement.height = videoElement.videoHeight
    context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvasElement.toBlob(resolve, 'image/jpeg', 0.85)
    })

    if (!blob) {
      return null
    }

    return new File([blob], `live-frame-${Date.now()}.jpg`, {
      type: 'image/jpeg',
    })
  }

  const runDetectionFrame = async () => {
    if (!detectionEnabledRef.current || !stream || requestInFlightRef.current) {
      return
    }

    requestInFlightRef.current = true
    setIsProcessingFrame(true)

    try {
      const frameFile = await captureFrameFile()

      if (!frameFile) {
        return
      }

      const result = await detectFromFile(frameFile, 'image')
      setError('')
      const meaningfulDetection = hasMeaningfulDetection(result)

      if (meaningfulDetection) {
        const displayResult = buildDisplayResult(result)
        const signature = getDetectionSignature(displayResult)
        const now = Date.now()

        setLatestResult(displayResult)
        onDetectionResult?.(displayResult)

        const isDuplicateHistoryItem =
          lastHistorySignatureRef.current === signature &&
          now - lastHistoryTimestampRef.current < DUPLICATE_HISTORY_WINDOW_MS

        if (!isDuplicateHistoryItem) {
          lastHistorySignatureRef.current = signature
          lastHistoryTimestampRef.current = now

          setHistory((previous) => [
            {
              accidentDetected: displayResult.accident_detected,
              confidence: getHighestDetectionConfidence(displayResult),
              id: `${now}`,
              labels: displayResult.detections.map((detection) => detection.label),
              timestamp: displayResult.timestamp,
            },
            ...previous,
          ].slice(0, 5))
        }
      }

      if (result.accident_detected) {
        const now = Date.now()
        const signature = getDetectionSignature(result)

        if (
          now - lastAlertTimestampRef.current > ALERT_DEBOUNCE_MS ||
          lastAlertSignatureRef.current !== signature
        ) {
          lastAlertTimestampRef.current = now
          lastAlertSignatureRef.current = signature

          try {
            if (audioRef.current) {
              audioRef.current.currentTime = 0
              await audioRef.current.play()
            }
          } catch (playbackError) {
            console.warn('Could not play alert sound:', playbackError)
          }
        }
      }
    } catch (detectionError) {
      const message =
        detectionError instanceof Error
          ? detectionError.message
          : 'Live detection failed.'

      setError(message)
      onError?.(message)
    } finally {
      requestInFlightRef.current = false
      setIsProcessingFrame(false)
    }
  }

  const startDetection = async (skipCameraBoot = false) => {
    if (!stream) {
      if (skipCameraBoot) {
        return
      }

      autoStartDetectionRef.current = true
      await startCamera()
      return
    }

    if (detectionEnabledRef.current) {
      return
    }

    detectionEnabledRef.current = true
    setIsDetecting(true)
    setError('')

    await runDetectionFrame()

    detectionIntervalRef.current = setInterval(() => {
      void runDetectionFrame()
    }, detectionIntervalMs)
  }

  const isStreaming = !!stream
  const overlayLabels = latestResult?.detections.map((detection) => detection.label) ?? []

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border border-border">
        <CctvVideoOverlay
          annotatedPreviewUrl={resolvedAnnotatedMediaUrl}
          isDetecting={isDetecting}
          isLive={isStreaming}
          labels={overlayLabels}
          timestamp={overlayTimestamp}
        >
          {isStreaming ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <div className="space-y-3 text-center">
                {isStartingCamera ? (
                  <Loader className="mx-auto h-8 w-8 animate-spin text-primary" />
                ) : (
                  <Camera className="mx-auto h-12 w-12 text-primary/60" />
                )}
                <div>
                  <p className="font-medium text-white">
                    {isStartingCamera ? 'Starting camera...' : 'CCTV camera preview is off'}
                  </p>
                  <p className="text-sm text-white/70">
                    Start the browser camera, then enable continuous live detection.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isProcessingFrame && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-black/70 px-4 py-3 text-sm text-white">
              <Loader className="h-4 w-4 animate-spin" />
              Processing live frame
            </div>
          )}
        </CctvVideoOverlay>

        <div className="space-y-4 p-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              onClick={startCamera}
              disabled={isStartingCamera || isStreaming}
            >
              {isStartingCamera ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Camera
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={stopCamera}
              disabled={!isStreaming}
            >
              <Square className="mr-2 h-4 w-4" />
              Stop Camera
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void startDetection()}
              disabled={isStartingCamera || isDetecting}
            >
              <Eye className="mr-2 h-4 w-4" />
              Start Detection
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={stopDetection}
              disabled={!isDetecting}
            >
              <EyeOff className="mr-2 h-4 w-4" />
              Stop Detection
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Live detection starts automatically with the camera. Frames are sent
            every {detectionIntervalMs}ms, and a new request will not start until
            the previous one finishes.
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </Card>

      {latestResult && (
        <Card className="border border-border">
          <div className="border-b border-border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Latest Live Detection</h3>
                <p className="text-sm text-muted-foreground">
                  Updated only when the camera finds a meaningful detection.
                </p>
              </div>
              <Badge
                className={
                  latestResult.accident_detected
                    ? 'min-w-[10.5rem] justify-center border-destructive/50 bg-destructive/20 text-destructive'
                    : 'min-w-[10.5rem] justify-center border-green-500/50 bg-green-500/20 text-green-400'
                }
                variant="outline"
              >
                {latestResult.accident_detected ? 'Accident Detected' : 'Vehicle Detected'}
              </Badge>
            </div>
          </div>

          <div className="space-y-6 p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="min-h-24 rounded-lg border border-border/50 bg-card/50 p-4">
                <p className="text-sm text-muted-foreground">Confidence</p>
                <p className="w-[7ch] font-mono text-2xl font-bold tabular-nums">
                  {(latestResult.confidence * 100).toFixed(1)}%
                </p>
              </div>
              <div className="min-h-24 rounded-lg border border-border/50 bg-card/50 p-4">
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="min-h-[1.75rem] text-lg font-semibold leading-7">
                  {latestResult.location}
                </p>
              </div>
              <div className="min-h-24 rounded-lg border border-border/50 bg-card/50 p-4">
                <p className="text-sm text-muted-foreground">Timestamp</p>
                <p className="min-w-[10ch] whitespace-nowrap font-mono text-lg font-semibold tabular-nums">
                  {new Date(latestResult.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold">Live Labels</p>
              {latestResult.detections.length > 0 ? (
                <div className="space-y-2">
                  {latestResult.detections.map((detection, index) => (
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
                  No labels were returned for the latest frame.
                </p>
              )}
            </div>

            <DetectedMediaViewer
              initialOpen={latestResult.accident_detected && !!resolvedAnnotatedMediaUrl}
              mediaType="image"
              mediaUrl={latestResult.annotated_media_url ?? null}
              title="Latest Live Detection Frame"
              description="This is the latest annotated frame returned by the live camera detection loop."
              buttonLabel="View Annotated Frame"
            />
          </div>
        </Card>
      )}

      <RecentDetectionHistory entries={history} />
    </div>
  )
}
