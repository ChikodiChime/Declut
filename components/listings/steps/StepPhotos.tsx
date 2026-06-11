'use client'

import { useState, useRef } from 'react'
import { CldImage } from 'next-cloudinary'
import { ImagePlus, X, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui'
import { ImageCropper } from '../ImageCropper'
import { useUploadImage } from '@/lib/hooks/useListings'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const MAX_PHOTOS = 5

interface SortablePhotoProps {
  id: string
  index: number
  onRemove: () => void
}

function SortablePhoto({ id, index, onRemove }: SortablePhotoProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative aspect-[4/3] rounded-lg overflow-hidden bg-border touch-none"
    >
      <CldImage
        src={id}
        fill
        sizes="(max-width: 640px) 33vw, 20vw"
        className="object-cover"
        alt={`Photo ${index + 1}`}
      />

      {/* Drag handle */}
      <button
        type="button"
        className="absolute top-1 left-1 w-6 h-6 rounded-md bg-black/60 text-white flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-black/80 transition-colors"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={12} strokeWidth={2.5} />
      </button>

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
        aria-label="Remove photo"
      >
        <X size={12} strokeWidth={2.5} />
      </button>

      {/* Cover badge */}
      {index === 0 && (
        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary text-white">
          Cover
        </span>
      )}
    </div>
  )
}

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setImages((prev) => {
      const from = prev.indexOf(active.id as string)
      const to = prev.indexOf(over.id as string)
      return arrayMove(prev, from, to)
    })
  }

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
          Add up to {MAX_PHOTOS} photos. Drag to reorder — the first photo is the cover.
        </p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={images} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 gap-3">
            {images.map((id, i) => (
              <SortablePhoto
                key={id}
                id={id}
                index={i}
                onRemove={() => handleRemove(i)}
              />
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
        </SortableContext>
      </DndContext>

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
