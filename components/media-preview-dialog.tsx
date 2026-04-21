'use client'

import { useEffect, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface MediaPreviewDialogProps {
  description: string
  fallbackUrl?: string | null
  mediaType: 'image' | 'video'
  mediaUrl: string | null
  onOpenChange: (open: boolean) => void
  open: boolean
  title: string
  warning?: string | null
}

export function MediaPreviewDialog({
  description,
  fallbackUrl,
  mediaType,
  mediaUrl,
  onOpenChange,
  open,
  title,
  warning,
}: MediaPreviewDialogProps) {
  const [videoFailed, setVideoFailed] = useState(false)
  const showVideoElement = mediaType === 'video' && mediaUrl && !videoFailed

  useEffect(() => {
    setVideoFailed(false)
  }, [mediaType, mediaUrl, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border border-border bg-card">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {showVideoElement ? (
          <video
            key={mediaUrl}
            src={mediaUrl}
            controls
            preload="metadata"
            className="max-h-[70vh] w-full rounded-lg bg-black"
            onError={() => setVideoFailed(true)}
          >
            Your browser does not support video playback.
          </video>
        ) : !mediaUrl ? (
          <div className="space-y-4 rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            <p>Preview is not available for this file in the current browser.</p>
            {fallbackUrl ? (
              <Button asChild variant="outline">
                <a href={fallbackUrl} target="_blank" rel="noreferrer">
                  Open Output File
                </a>
              </Button>
            ) : null}
          </div>
        ) : mediaType === 'video' ? (
          <div className="space-y-4 rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-sm text-muted-foreground">
            <p>
              Inline video playback was not available for this file in the current browser.
            </p>
            {fallbackUrl ? (
              <Button asChild variant="outline">
                <a href={fallbackUrl} target="_blank" rel="noreferrer">
                  Open Output File
                </a>
              </Button>
            ) : null}
          </div>
        ) : (
          <img
            src={mediaUrl}
            alt="Detected annotated result"
            className="max-h-[70vh] w-full rounded-lg object-contain"
          />
        )}

        {(warning || (mediaType === 'video' && videoFailed)) && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-950">
            {warning ??
              'This annotated video file exists, but this browser could not play it inline.'}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
