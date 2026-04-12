import { getMimeType } from '#/lib/utils/utils'
import { minio } from '../db/db'

const CHUNK_SIZE = 64 * 1024 * 1024

export async function emptyBucket({ bucketId }: { bucketId: string }) {
  const objectsStream = minio.listObjectsV2(bucketId, '', true)

  const objects: string[] = []
  for await (const obj of objectsStream) {
    objects.push(obj.name)
  }

  if (objects.length > 0) {
    const res = await minio.removeObjects(bucketId, objects)
    const errors: string[] = []
    res.forEach((r) => {
      if (r && r.Error && r.Error.Message) errors.push(r.Error.Message)
    })
    if (errors.length > 0) return errors
  }
  return true
}

export async function createBucket({ bucketPrefix }: { bucketPrefix: string }) {
  let bucketId = ''
  let exists = true
  do {
    bucketId = `${bucketPrefix.replaceAll('_', '-')}-${crypto.randomUUID()}`
    exists = await minio.bucketExists(bucketId)
  } while (exists)

  await minio.makeBucket(bucketId)
  return bucketId
}

export async function getPresignedPutUrl({
  originalName,
  extension,
  bucketId,
  exipryTime = 60 * 60,
}: {
  originalName: string
  extension: string
  bucketId: string
  exipryTime?: number
}) {
  const objectName = `${originalName}-${crypto.randomUUID()}.${extension}`
  const url = await minio.presignedPutObject(bucketId, objectName, exipryTime)

  return { url, objectName }
}

export async function initiateMultipartUpload({
  bucketId,
  originalName,
  extension,
  fileSize,
  expiryTime = 60 * 60,
}: {
  bucketId: string
  originalName: string
  extension: string
  fileSize: number
  expiryTime?: number
}) {
  const objectName = `${originalName}-${crypto.randomUUID()}.${extension}`
  const contentType = getMimeType(extension)

  const partCount = Math.ceil(fileSize / CHUNK_SIZE)

  // Initiate multipart upload — returns an uploadId
  const uploadId = await minio.initiateNewMultipartUpload(
    bucketId,
    objectName,
    { 'Content-Type': contentType },
  )

  const partUrls: { partNumber: number; url: string }[] = []

  for (let i = 1; i <= partCount; i++) {
    const url = await minio.presignedUrl(
      'PUT',
      bucketId,
      objectName,
      expiryTime,
      {
        partNumber: String(i),
        uploadId,
      },
    )
    partUrls.push({ partNumber: i, url })
  }

  return { uploadId, objectName, partUrls, partCount }
}

export async function completeMultipartUpload({
  bucketId,
  objectName,
  uploadId,
  etags,
}: {
  bucketId: string
  objectName: string
  uploadId: string
  etags: {
    part: number
    etag: string
  }[]
}) {
  await minio.completeMultipartUpload(bucketId, objectName, uploadId, etags)

  return { objectName }
}
