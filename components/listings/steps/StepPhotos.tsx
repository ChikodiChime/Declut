'use client'

import { useState, useRef } from 'react'
import { CldImage } from 'next-cloudinary'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { ImageCropper } from '../ImageCropper'
import { useUploadImage } from '@/lib/hooks/useListings'
import { toast } from 'sonner'

const MAX_PHOTOS = 5

interface StepPhotosProps {
  defaultImages?: string[]
  onNext: (images: string[]) => void
  onBack: () => void
  isPending: boolean
}

export function StepPhotos({ defaultImages = [], onNext, onBack, isPending }: StepPhotosProps) {
  const [images, setImages] = useState<string[]>(defaultImages)
  const [cropQueue, setCropQueue] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { mutateAsync: uploadImage, isPending: isUploading } = useUploadImage()

  const currentCrop = cropQueue[0] ?? null

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    const remaining = MAX_PHOTOS - images.length
    const toProcess = files.slice(0, remaining)

    const urls = toProcess.map((f) => URL.createObjectURL(f))
    setCropQueue((prev) => [...prev, ...urls])
    e.target.value = ''
  }

  async function handleCropDone(blob: Blob) {
    const doneSrc = cropQueue[0]
    setCropQueue((prev) => prev.slice(1))
    if (doneSrc) URL.revokeObjectURL(doneSrc)

    try {
      const { public_id } = await uploadImage(blob)
      setImages((prev) => [...prev, public_id])
    } catch {
      // error toast handled inside useUploadImage onError
    }
  }

  function handleCancelCrop() {
    const doneSrc = cropQueue[0]
    if (doneSrc) URL.revokeObjectURL(doneSrc)
    setCropQueue((prev) => prev.slice(1))
  }

  function handleRemove(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit() {
    if (images.length === 0) {
      toast.error('Please add at least one photo')
      return
    }
    onNext(images)
  }

  const canAddMore = images.length < MAX_PHOTOS && cropQueue.length === 0

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-text">Photos</h2>
        <p className="text-sm text-text-muted">
          Add up to {MAX_PHOTOS} photos. First photo is the cover image.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {images.map((public_id, i) => (
          <div key={public_id} className="relative aspect-[4/3] rounded-lg overflow-hidden bg-border">
            <CldImage
              src={public_id}
              fill
              sizes="(max-width: 640px) 33vw, 20vw"
              className="object-cover"
              alt={`Photo ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              aria-label="Remove photo"
            >
              <X size={12} strokeWidth={2.5} />
            </button>
            {i === 0 && (
              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/60 text-white">
                Cover
              </span>
            )}
          </div>
        ))}

        {canAddMore && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="aspect-[4/3] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 text-text-muted hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <span className="text-xs">Uploading…</span>
            ) : (
              <>
                <ImagePlus size={22} strokeWidth={1.5} />
                <span className="text-xs font-medium">Add photos</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {currentCrop && (
        <ImageCropper
          imageSrc={currentCrop}
          queueRemaining={cropQueue.length - 1}
          onCropDone={handleCropDone}
          onCancel={handleCancelCrop}
        />
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onBack}
          disabled={isPending}
        >
          Back
        </Button>
        <Button
          className="flex-1"
          onClick={handleSubmit}
          loading={isPending}
          disabled={isPending || isUploading || cropQueue.length > 0}
        >
          {isPending ? 'Publishing…' : 'Publish Listing'}
        </Button>
      </div>
    </div>
  )
}
