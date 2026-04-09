import type { Client as MinioClient } from 'minio'

export async function emptyBucket(bucketId: string, minio: MinioClient) {
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
