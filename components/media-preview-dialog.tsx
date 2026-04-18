'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface MediaPreviewDialogProps {
  description: string
  mediaType: 'image' | 'video'
  mediaUrl: string | null
  onOpenChange: (open: boolean) => void
  open: boolean
  title: string
}

export function MediaPreviewDialog({
  description,
  mediaType,
  mediaUrl,
  onOpenChange,
  open,
  title,
}: MediaPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border border-border bg-card">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {!mediaUrl ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            Preview is not available for this file.
          </div>
        ) : mediaType === 'video' ? (
          <video
            key={mediaUrl}
            src={mediaUrl}
            controls
            preload="metadata"
            className="max-h-[70vh] w-full rounded-lg bg-black"
          >
            Your browser does not support video playback.
          </video>
        ) : (
          <img
            src={mediaUrl}
            alt="Detected annotated result"
            className="max-h-[70vh] w-full rounded-lg object-contain"
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
