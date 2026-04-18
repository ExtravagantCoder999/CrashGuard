'use client'

import { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'

interface CctvVideoOverlayProps {
  annotatedPreviewUrl?: string | null
  children: ReactNode
  isDetecting: boolean
  isLive: boolean
  labels: string[]
  timestamp: string
}

export function CctvVideoOverlay({
  annotatedPreviewUrl,
  children,
  isDetecting,
  isLive,
  labels,
  timestamp,
}: CctvVideoOverlayProps) {
  return (
    <div className="relative aspect-video overflow-hidden bg-black/60">
      {children}

      <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-white/10 bg-black/65 px-3 py-2 text-xs font-mono text-white shadow-lg backdrop-blur-sm">
        {timestamp}
      </div>

      <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-2">
        {isLive && (
          <Badge className="bg-red-600/90 text-white hover:bg-red-600/90">
            LIVE
          </Badge>
        )}
        {isDetecting && (
          <Badge className="bg-primary/90 text-primary-foreground hover:bg-primary/90">
            SCANNING
          </Badge>
        )}
      </div>

      {labels.length > 0 && (
        <div className="pointer-events-none absolute bottom-4 left-4 flex max-w-[60%] flex-wrap gap-2">
          {labels.slice(0, 4).map((label, index) => (
            <Badge
              key={`${label}-${index}`}
              variant="outline"
              className="border-white/20 bg-black/65 capitalize text-white"
            >
              {label}
            </Badge>
          ))}
        </div>
      )}

      {annotatedPreviewUrl && (
        <div className="pointer-events-none absolute bottom-4 right-4 h-28 w-44 overflow-hidden rounded-lg border border-white/10 bg-black/70 shadow-xl backdrop-blur-sm sm:h-32 sm:w-52">
          <img
            src={annotatedPreviewUrl}
            alt="Latest annotated detection preview"
            className="h-full w-full object-cover"
          />
        </div>
      )}
    </div>
  )
}
