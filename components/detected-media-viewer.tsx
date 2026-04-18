'use client'

import { useEffect, useMemo, useState } from 'react'

import { MediaPreviewDialog } from '@/components/media-preview-dialog'
import { Button } from '@/components/ui/button'
import { resolveBackendMediaUrl } from '@/lib/api-client'

interface DetectedMediaViewerProps {
  buttonLabel?: string
  description: string
  initialOpen?: boolean
  mediaType: 'image' | 'video'
  mediaUrl: string | null
  title: string
}

export function DetectedMediaViewer({
  buttonLabel,
  description,
  initialOpen = false,
  mediaType,
  mediaUrl,
  title,
}: DetectedMediaViewerProps) {
  const [open, setOpen] = useState(initialOpen)

  const resolvedMediaUrl = useMemo(
    () => resolveBackendMediaUrl(mediaUrl),
    [mediaUrl]
  )

  useEffect(() => {
    if (initialOpen && resolvedMediaUrl) {
      setOpen(true)
    }
  }, [initialOpen, resolvedMediaUrl])

  if (!resolvedMediaUrl) {
    return null
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        {buttonLabel ?? (mediaType === 'video' ? 'View Footage' : 'View Image')}
      </Button>

      <MediaPreviewDialog
        open={open}
        onOpenChange={setOpen}
        mediaType={mediaType}
        mediaUrl={resolvedMediaUrl}
        title={title}
        description={description}
      />
    </>
  )
}
