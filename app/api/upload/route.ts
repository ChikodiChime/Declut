import { v2 as cloudinary } from 'cloudinary'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

console.log('Cloudinary env check:', {
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY ? '***' : undefined,
  api_secret: process.env.CLOUDINARY_API_SECRET ? '***' : undefined,
})

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return err('Invalid form data', 'BAD_REQUEST', 400)
  }
  const file = formData.get('file') as File | null

  if (!file) {
    return err('No file provided', 'VALIDATION_ERROR', 400)
  }

  if (!file.type.startsWith('image/')) {
    return err('File must be an image', 'VALIDATION_ERROR', 400)
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  let result: { public_id: string }
  try {
    result = await new Promise<{ public_id: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: 'declut/listings', resource_type: 'image' },
          (uploadError, res) => {
            if (uploadError || !res) return reject(uploadError ?? new Error('Upload failed'))
            resolve({ public_id: res.public_id })
          }
        )
        .end(buffer)
    })
  } catch (uploadErr) {
    console.error('Cloudinary upload error:', uploadErr)
    const message = uploadErr instanceof Error ? uploadErr.message : 'Upload failed'
    return err(message, 'SERVER_ERROR', 500)
  }

  return ok(result, 201)
}
