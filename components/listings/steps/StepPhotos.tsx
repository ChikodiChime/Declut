'use client'

import { useState, useRef } from 'react'
import { CldImage } from 'next-cloudinary'
import { Button } from '@/components/ui'
import { ImageCropper } from '../ImageCropper'
import { useUploadImage } from '@/lib/hooks/useListings'
import { toast } from 'sonner'

interface StepPhotosProps {
  defaultImages?: string[]
  onNext: (images: string[]) => void
  onBack: () => void
  isPending: boolean
}

export function StepPhotos({ defaultImages = [], onNext, onBack, isPending }: StepPhotosProps) {
  const [images, setImages] = useState<string[]>(defaultImages)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { mutateAsync: uploadImage, isPending: isUploading } = useUploadImage()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setCropSrc(url)
    e.target.value = ''
  }

  async function handleCropDone(blob: Blob) {
    setCropSrc(null)
    try {
      const { public_id } = await uploadImage(blob)
      setImages((prev) => [...prev, public_id])
    } catch {
      // error toast is handled inside useUploadImage onError
    }
  }

  function handleCancelCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
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

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-text">Photos</h2>
        <p className="text-sm text-text-muted">Add 1–5 photos. First photo is the cover image.</p>
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
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80"
            >
              ×
            </button>
          </div>
        ))}

        {images.length < 5 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="aspect-[4/3] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-text-muted hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <span className="text-xs">Uploading…</span>
            ) : (
              <>
                <span className="text-2xl leading-none">+</span>
                <span className="text-xs">Add photo</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {cropSrc && (
        <ImageCropper
          imageSrc={cropSrc}
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
          disabled={isPending || isUploading}
        >
          {isPending ? 'Publishing…' : 'Publish Listing'}
        </Button>
      </div>
    </div>
  )
}
