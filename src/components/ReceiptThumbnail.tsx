'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// Shared component — lazy-generates a signed URL on mount and renders
// an <img> for images or a 📄 icon for PDFs. Used in PaymentList and ContributionsView.

function isImagePath(path: string) {
  return /\.(jpg|jpeg|png|gif|webp|heic|avif)$/i.test(path)
}

type Props = {
  receiptPath: string
  // Called when user taps; the signed URL is passed so the caller can open it
  onOpen: (signedUrl: string) => void
  loading?: boolean
}

export function ReceiptThumbnail({ receiptPath, onOpen, loading = false }: Props) {
  const [src, setSrc] = useState<string | null>(null)
  const isImage = isImagePath(receiptPath)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await createClient()
        .storage.from('receipts')
        .createSignedUrl(receiptPath, 3600)
      if (!cancelled && data?.signedUrl) setSrc(data.signedUrl)
    }
    load()
    return () => { cancelled = true }
  }, [receiptPath])

  return (
    <button
      type="button"
      onClick={() => src && onOpen(src)}
      disabled={loading || !src}
      className="shrink-0 w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center active:opacity-70 disabled:opacity-40"
      aria-label="View receipt"
    >
      {loading ? (
        <span className="text-xs text-gray-400">…</span>
      ) : isImage && src ? (
        <img src={src} alt="Receipt" className="w-full h-full object-cover" />
      ) : isImage && !src ? (
        <span className="text-gray-300 text-xl">🖼</span>
      ) : (
        <span className="text-2xl">📄</span>
      )}
    </button>
  )
}
