import { deleteBucketService } from '#/lib/server/services/minio.services'
import { json } from '#/lib/utils/utils'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_unprotected/api/delete-bucket-unprotected/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        await deleteBucketService({ bucketId: params.id })
        return json({ success: true })
      },
    },
  },
})
