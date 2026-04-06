import { v2 as cloudinary } from 'cloudinary'
import { getAuthUser } from '@/lib/auth'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return Response.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return Response.json({ error: 'File must be an image' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const result = await new Promise<{ public_id: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: 'listings', resource_type: 'image' },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload failed'))
          resolve({ public_id: result.public_id })
        }
      )
      .end(buffer)
  })

  return Response.json(result, { status: 201 })
}
