// Backend API response types for Car Crash Detection System
// These types match the FastAPI backend response format

export interface BoundingBox {
  label: string
  score: number
  box: [number, number, number, number] // [x1, y1, x2, y2]
}

export interface DetectionResponse {
  success: boolean
  accident_detected: boolean
  confidence: number
  media_type: 'image' | 'video'
  timestamp: string
  location: string
  detections: BoundingBox[]
  annotated_media_url?: string | null
  annotated_media_available?: boolean
  annotated_media_previewable?: boolean
  annotated_media_download_url?: string | null
  annotated_media_format?: string | null
  annotated_media_warning?: string | null
  processing_notes?: string | null
}

export interface Incident {
  id: string
  timestamp: string
  location: string
  confidence: number
  media_type: 'image' | 'video' | 'cctv'
  status: 'critical' | 'warning' | 'processed'
  accident_detected: boolean
  source_file?: string
  latitude?: number
  longitude?: number
}

export interface Notification {
  id: string
  incident_id: string
  title: string
  message: string
  timestamp: string
  severity: 'critical' | 'warning' | 'info'
  read: boolean
}

export interface HealthResponse {
  status: 'ok' | 'error'
  timestamp: string
  version: string
}

export interface UploadProgress {
  progress: number
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
}

// Mock data for demo when backend is unavailable
export const MOCK_INCIDENTS: Incident[] = [
  {
    id: 'INC001',
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
    location: 'Intersection A - Main St & 5th Ave',
    confidence: 0.91,
    media_type: 'video',
    status: 'critical',
    accident_detected: true,
    latitude: 40.7128,
    longitude: -74.006,
  },
  {
    id: 'INC002',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    location: 'Highway 101 - Exit 45',
    confidence: 0.87,
    media_type: 'image',
    status: 'critical',
    accident_detected: true,
    latitude: 37.7749,
    longitude: -122.4194,
  },
  {
    id: 'INC003',
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    location: 'Downtown - 3rd St',
    confidence: 0.62,
    media_type: 'video',
    status: 'warning',
    accident_detected: false,
    latitude: 40.7580,
    longitude: -73.9855,
  },
]

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'NOT001',
    incident_id: 'INC001',
    title: 'Critical Accident Detected',
    message: 'Severe collision detected at Intersection A - Main St & 5th Ave (91% confidence)',
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
    severity: 'critical',
    read: false,
  },
  {
    id: 'NOT002',
    incident_id: 'INC002',
    title: 'Accident Alert',
    message: 'Traffic accident detected on Highway 101 - Exit 45 (87% confidence)',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    severity: 'critical',
    read: false,
  },
  {
    id: 'NOT003',
    incident_id: 'INC003',
    title: 'Suspicious Activity',
    message: 'Potential collision at Downtown - 3rd St (62% confidence) - requires review',
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    severity: 'warning',
    read: true,
  },
]
