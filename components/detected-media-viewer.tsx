'use client'

import { useEffect, useMemo, useState } from 'react'

import { MediaPreviewDialog } from '@/components/media-preview-dialog'
import { Button } from '@/components/ui/button'
import { resolveBackendMediaUrl } from '@/lib/api-client'

interface DetectedMediaViewerProps {
  buttonLabel?: string
  description: string
  fallbackUrl?: string | null
  initialOpen?: boolean
  mediaType: 'image' | 'video'
  mediaUrl: string | null
  title: string
  warning?: string | null
}

export function DetectedMediaViewer({
  buttonLabel,
  description,
  fallbackUrl,
  initialOpen = false,
  mediaType,
  mediaUrl,
  title,
  warning,
}: DetectedMediaViewerProps) {
  const [open, setOpen] = useState(initialOpen)

  const resolvedMediaUrl = useMemo(
    () => resolveBackendMediaUrl(mediaUrl),
    [mediaUrl]
  )
  const resolvedFallbackUrl = useMemo(
    () => resolveBackendMediaUrl(fallbackUrl),
    [fallbackUrl]
  )

  useEffect(() => {
    if (initialOpen && (resolvedMediaUrl || resolvedFallbackUrl)) {
      setOpen(true)
    }
  }, [initialOpen, resolvedFallbackUrl, resolvedMediaUrl])

  if (!resolvedMediaUrl && !resolvedFallbackUrl) {
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
        fallbackUrl={resolvedFallbackUrl}
        title={title}
        description={description}
        warning={warning}
      />
    </>
  )
}
