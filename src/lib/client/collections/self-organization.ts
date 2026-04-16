import type { Visibility } from '#/lib/server/db/generated/enums'
import { createOrganizationResource } from '#/lib/server/functions/organization.functions'
import { organizationSchema } from '#/lib/types/collection-schemas/organization'
import { getElectricUrl } from '#/lib/utils/electric'
import { snakeCamelMapper } from '@electric-sql/client'
import { electricCollectionOptions } from '@tanstack/electric-db-collection'
import { createCollection, createOptimisticAction } from '@tanstack/react-db'
import { toast } from 'sonner'

export const selfOrganizationCollection = createCollection(
  electricCollectionOptions({
    shapeOptions: {
      url: `${getElectricUrl()}/self-organizations`,
      parser: { timestamptz: (date: string) => new Date(date) },
      columnMapper: snakeCamelMapper(),
    },
    schema: organizationSchema,
    getKey: (item) => item.id,
  }),
)

export const createOrganizationResourceAction = createOptimisticAction<{
  name: string
  identifier: string
  imageFile?: File | Blob
  visibility: Visibility
}>({
  onMutate: ({ name, identifier }) => {
    selfOrganizationCollection.insert({
      id: crypto.randomUUID(),
      name,
      identifier,
      storageBucketId: '__pending__',
      imageFileId: '__pending__',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  },
  mutationFn: async ({ name, identifier, visibility }) => {
    const result = await createOrganizationResource({
      data: {
        name,
        identifier,
        visibility,
      },
    })

    if (result.success) {
      await selfOrganizationCollection.utils.awaitTxId(result.data.txid)
      toast.success('Organization Created')
    } else {
      await selfOrganizationCollection.utils.awaitTxId(result.data?.txid || 0)
      toast.success(result.error, {
        description: result.data?.permissionsRequired,
      })
    }
  },
})
