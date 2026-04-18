<<<<<<< HEAD
# Car Crash Detection System - Frontend

A modern Next.js web application for detecting traffic accidents using AI-powered YOLO computer vision models. Built with TypeScript, Tailwind CSS, and shadcn/ui components.

## Features

- 🎬 **Upload Media** - Drag-and-drop interface for images and videos
- 🚨 **Real-time Alerts** - Instant notifications with browser alerts and audio
- 🗺️ **Live Map** - Visualize detected accidents on an interactive Leaflet map
- 📊 **Dashboard** - Monitor detection statistics and history
- 🖼️ **CCTV Samples** - Demo gallery of sample footage for testing
- 🔔 **Notifications** - Track all alerts and incident details
- 📱 **Responsive** - Mobile-friendly dark theme interface

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Maps**: Leaflet.js
- **State Management**: React hooks + SWR
- **UI Components**: Fully accessible shadcn/ui components

## Project Structure

```
app/
├── page.tsx                 # Landing page
├── dashboard/
│   ├── page.tsx            # Main dashboard with stats
│   ├── upload/
│   │   └── page.tsx        # Upload and detection page
│   ├── map/
│   │   └── page.tsx        # Live incident map
│   ├── notifications/
│   │   └── page.tsx        # Alert notifications
│   └── settings/
│       └── page.tsx        # Configuration page
└── samples/
    └── page.tsx            # CCTV samples gallery

components/
├── dashboard-sidebar.tsx   # Navigation sidebar
├── live-map.tsx           # Leaflet map component
└── ui/                    # shadcn/ui components

lib/
├── api-client.ts          # API service layer
└── types.ts               # TypeScript interfaces
```

## Getting Started

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. Create a `.env.local` file:
   ```bash
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
   NEXT_PUBLIC_USE_MOCK_DATA=true
   ```

4. Run the development server:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## FastAPI Backend Integration

### Expected API Endpoints

The frontend expects these endpoints from your FastAPI backend:

#### Detection Endpoints
```
POST /api/detect/image
POST /api/detect/video
```

Request: `multipart/form-data` with file upload
Response:
```json
{
  "success": true,
  "accident_detected": true,
  "confidence": 0.91,
  "media_type": "video",
  "timestamp": "2026-04-17T12:30:00Z",
  "location": "Intersection A",
  "detections": [
    {
      "label": "vehicle",
      "score": 0.95,
      "box": [100, 120, 220, 260]
    }
  ],
  "annotated_media_url": "/outputs/result.mp4"
}
```

#### Data Endpoints
```
GET /api/incidents       # List all detected incidents
GET /api/notifications   # Get notifications
GET /api/health         # Backend health check
```

### Setting Up Your Backend

Example FastAPI setup:

```python
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import cv2
from ultralytics import YOLO

app = FastAPI()
model = YOLO("yolov8n.pt")  # or YOLO11

@app.post("/api/detect/image")
async def detect_image(file: UploadFile = File(...)):
    # Read image
    contents = await file.read()
    # Run YOLO detection
    results = model.predict(contents)
    # Return formatted response
    return {
        "success": True,
        "accident_detected": True,
        "confidence": 0.91,
        ...
    }

@app.get("/api/health")
async def health():
    return {"status": "ok"}
```

### Environment Variables

- `NEXT_PUBLIC_BACKEND_URL` - URL to FastAPI backend (default: `http://localhost:8000`)
- `NEXT_PUBLIC_USE_MOCK_DATA` - Use mock data when backend unavailable (default: `true`)

## Key Components

### API Client (`lib/api-client.ts`)
- `detectFromFile()` - Upload and detect accidents
- `getIncidents()` - Fetch incident history
- `getNotifications()` - Get alert notifications
- `getDashboardStats()` - Summary statistics
- `checkBackendHealth()` - Verify backend connection

Mock data fallback when backend is unavailable for demo purposes.

### Notifications System
- Automatic browser notifications for critical alerts
- Optional audio alert sound
- Severity-based styling (critical/warning/info)
- Mark-as-read functionality

### Live Map
- Leaflet-based interactive map
- Red pins for accidents, blue pins for safe detections
- Click to view incident details
- Popup with confidence scores and metadata

## Styling & Theme

The app uses a dark CCTV monitoring theme:
- **Primary**: Orange accent for alerts and CTAs
- **Background**: Very dark gray (near black) for CCTV aesthetic
- **Cards**: Slightly lighter dark gray for contrast
- **Destructive**: Red for critical alerts

All colors and fonts are defined in `tailwind.config.ts` and `app/globals.css` using CSS custom properties.

## Development

### Adding Components

Components are in `components/` and use shadcn/ui patterns:

```tsx
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function MyComponent() {
  return (
    <Card>
      <Button>Click me</Button>
    </Card>
  )
}
```

### Creating New Pages

Pages go in `app/` with automatic routing:

```tsx
export default function MyPage() {
  return <div>My Page</div>
}
```

### Fetching Data

Use the API client for all backend calls:

```tsx
import { detectFromFile, getIncidents } from '@/lib/api-client'

const result = await detectFromFile(file, 'image')
const incidents = await getIncidents()
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables in Vercel settings
4. Deploy with one click

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
CMD npm start
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT - Built for educational purposes

## Notes for School/Demo

- Click "View Sample CCTV" on landing page to see demo media
- Use mock data mode to test without backend
- All API responses include mock fallback data
- Audio alert sound plays on accident detection (if enabled)
- Map updates automatically when incidents are detected

---

**Built with Next.js + FastAPI for intelligent traffic monitoring**
=======
# CARCRASH
CARCRASH SS
>>>>>>> 6e9ea9b704b9e2209ed1d8f5f275d09cf68137e0
