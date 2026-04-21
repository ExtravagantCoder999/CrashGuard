// API client for car crash detection backend
// Replace BACKEND_URL with your FastAPI server URL (e.g., http://localhost:8000)

import {
  DetectionResponse,
  Incident,
  Notification,
  HealthResponse,
  MOCK_INCIDENTS,
  MOCK_NOTIFICATIONS,
} from './types'

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'
export const NORMALIZED_BACKEND_URL = BACKEND_URL.replace(/\/+$/, '')
export const IS_DEFAULT_BACKEND_URL = !process.env.NEXT_PUBLIC_BACKEND_URL
export const BACKEND_URL_SOURCE = IS_DEFAULT_BACKEND_URL
  ? 'Fallback default'
  : 'NEXT_PUBLIC_BACKEND_URL'
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'avi', 'm4v', 'mkv']
export type DetectionMediaType = 'image' | 'video'

function buildBackendUnreachableMessage() {
  const guidance = [
    `Could not reach the backend at ${NORMALIZED_BACKEND_URL}.`,
    'Make sure the FastAPI server is running and that `NEXT_PUBLIC_BACKEND_URL` points to the correct address.',
  ]

  if (typeof window === 'undefined') {
    return guidance.join(' ')
  }

  const pageUrl = new URL(window.location.href)
  const backendUrl = new URL(NORMALIZED_BACKEND_URL)

  if (
    pageUrl.protocol === 'https:' &&
    backendUrl.protocol === 'http:'
  ) {
    guidance.push(
      'This page is loaded over HTTPS but the backend uses HTTP, so the browser may be blocking the request as mixed content.'
    )
  }

  if (
    IS_DEFAULT_BACKEND_URL &&
    !['localhost', '127.0.0.1'].includes(pageUrl.hostname)
  ) {
    guidance.push(
      'The app is using the fallback `http://localhost:8000`, which only works when this browser can reach the API on the same machine.'
    )
  }

  return guidance.join(' ')
}

function createMockDetectionResponse(
  mediaType: DetectionMediaType
): DetectionResponse {
  return {
    success: true,
    accident_detected: Math.random() > 0.5,
    confidence: 0.75 + Math.random() * 0.25,
    media_type: mediaType,
    timestamp: new Date().toISOString(),
    location: 'Demo Location',
    detections: [
      {
        label: 'vehicle',
        score: 0.95,
        box: [100, 120, 220, 260],
      },
      {
        label: 'accident',
        score: 0.85,
        box: [140, 150, 260, 300],
      },
    ],
  }
}

export function detectMediaTypeFromFile(
  file: Pick<File, 'name' | 'type'>
): DetectionMediaType | null {
  if (file.type.startsWith('image/')) {
    return 'image'
  }

  if (file.type.startsWith('video/')) {
    return 'video'
  }

  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension && IMAGE_EXTENSIONS.includes(extension)) {
    return 'image'
  }

  if (extension && VIDEO_EXTENSIONS.includes(extension)) {
    return 'video'
  }

  return null
}

function validateDetectionFile(
  file: File,
  mediaType: DetectionMediaType
) {
  if (!(file instanceof File)) {
    throw new Error('No file was provided for detection.')
  }

  if (file.size <= 0) {
    throw new Error('The selected file is empty. Please choose a valid image or video.')
  }

  if (mediaType === 'image') {
    if (detectMediaTypeFromFile(file) !== 'image') {
      throw new Error('Please choose a valid image file before running detection.')
    }

    return
  }

  if (detectMediaTypeFromFile(file) !== 'video') {
    throw new Error('Please choose a valid video file before running detection.')
  }
}

/**
 * Resolve backend media URLs so the UI can handle either absolute or relative paths.
 */
export function resolveBackendMediaUrl(
  mediaUrl?: string | null
): string | null {
  if (!mediaUrl) {
    return null
  }

  if (/^https?:\/\//i.test(mediaUrl)) {
    return mediaUrl
  }

  const normalizedPath = mediaUrl.startsWith('/') ? mediaUrl : `/${mediaUrl}`
  return `${NORMALIZED_BACKEND_URL}${normalizedPath}`
}

/**
 * Generic fetch wrapper with error handling
 * @param endpoint API endpoint path
 * @param options Fetch options
 * @returns Parsed JSON response
 */
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${NORMALIZED_BACKEND_URL}${endpoint}`

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return (await response.json()) as T
  } catch (error) {
    console.error(`API call failed to ${url}:`, error)
    throw error
  }
}

async function readErrorMessage(
  response: Response,
  fallbackMessage: string
): Promise<string> {
  try {
    const data = (await response.json()) as {
      detail?: string
      error?: string
      message?: string
    }

    return data.detail || data.error || data.message || fallbackMessage
  } catch {
    try {
      const text = await response.text()
      return text || fallbackMessage
    } catch {
      return fallbackMessage
    }
  }
}

/**
 * Upload image or video file for detection
 * @param file Image or video file to detect
 * @param mediaType Type of media ('image' or 'video')
 * @returns Detection result with accident status and confidence
 *
 * BACKEND INTEGRATION:
 * - POST /api/detect/image with multipart/form-data
 * - POST /api/detect/video with multipart/form-data
 * - Should run YOLO model and return detection results
 */
export async function detectFromFile(
  file: File,
  mediaType?: DetectionMediaType
): Promise<DetectionResponse> {
  try {
    const resolvedMediaType = mediaType ?? detectMediaTypeFromFile(file)

    if (!resolvedMediaType) {
      throw new Error('Please select an image or video file.')
    }

    validateDetectionFile(file, resolvedMediaType)

    const formData = new FormData()
    formData.append('file', file)

    let response: Response

    try {
      console.info(
        `[detect] Sending ${resolvedMediaType} file to backend`,
        {
          endpoint: `${NORMALIZED_BACKEND_URL}/api/detect/${resolvedMediaType}`,
          filename: file.name,
          size: file.size,
          type: file.type || 'unknown',
        }
      )

      response = await fetch(`${NORMALIZED_BACKEND_URL}/api/detect/${resolvedMediaType}`, {
        method: 'POST',
        body: formData,
      })
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(buildBackendUnreachableMessage())
      }

      throw error
    }

    if (!response.ok) {
      const message = await readErrorMessage(
        response,
        `Detection failed with status ${response.status}.`
      )
      console.warn('[detect] Backend returned an error response', {
        mediaType: resolvedMediaType,
        status: response.status,
        message,
      })
      throw new Error(message)
    }

    const result = (await response.json()) as DetectionResponse
    console.info('[detect] Detection completed', {
      mediaType: resolvedMediaType,
      accident_detected: result.accident_detected,
      annotated_media_available: result.annotated_media_available,
      annotated_media_url: result.annotated_media_url,
    })
    return result
  } catch (error) {
    console.error('Detection request failed:', error)
    if (USE_MOCK_DATA) {
      console.warn('Falling back to mock detection response')
      return createMockDetectionResponse(
        mediaType ?? detectMediaTypeFromFile(file) ?? 'image'
      )
    }

    if (error instanceof Error) {
      throw error
    }

    throw new Error('Detection request failed.')
  }
}

/**
 * Get all recent incidents
 * @returns List of detected incidents
 *
 * BACKEND INTEGRATION:
 * - GET /api/incidents
 * - Should return paginated list of all detected accidents
 */
export async function getIncidents(): Promise<Incident[]> {
  try {
    return await apiCall<Incident[]>('/api/incidents')
  } catch (error) {
    console.warn('Failed to fetch incidents, using mock data')
    return MOCK_INCIDENTS
  }
}

/**
 * Get all notifications
 * @returns List of notifications for detected incidents
 *
 * BACKEND INTEGRATION:
 * - GET /api/notifications
 * - Should return alerts and notifications
 */
export async function getNotifications(): Promise<Notification[]> {
  try {
    return await apiCall<Notification[]>('/api/notifications')
  } catch (error) {
    console.warn('Failed to fetch notifications, using mock data')
    return MOCK_NOTIFICATIONS
  }
}

/**
 * Check backend health/status
 * @returns Health status of backend
 *
 * BACKEND INTEGRATION:
 * - GET /api/health
 * - Should return status and version info
 */
export async function checkBackendHealth(): Promise<HealthResponse> {
  try {
    return await apiCall<HealthResponse>('/api/health')
  } catch (error) {
    console.warn('Backend health check failed')
    return {
      status: 'error',
      timestamp: new Date().toISOString(),
      version: 'unknown',
    }
  }
}

/**
 * Get dashboard statistics
 * @returns Stats about uploads and detections
 */
export async function getDashboardStats() {
  try {
    const incidents = await getIncidents()
    const criticalCount = incidents.filter(
      (i) => i.status === 'critical'
    ).length
    const totalCount = incidents.length
    const accidentCount = incidents.filter(
      (i) => i.accident_detected
    ).length

    return {
      totalUploads: totalCount,
      accidentsDetected: accidentCount,
      pendingReviews: criticalCount,
      lastDetectionTime: incidents[0]?.timestamp || null,
    }
  } catch (error) {
    console.warn('Failed to get dashboard stats')
    return {
      totalUploads: 0,
      accidentsDetected: 0,
      pendingReviews: 0,
      lastDetectionTime: null,
    }
  }
}
