import type { Visibility } from '#/lib/server/db/generated/enums'
import { createFileResource } from '#/lib/server/functions/file.functions'
import {
  createOrganizationResource,
  deleteOrganizationResource,
  getOrganizationDetails,
  updateOrganizationResource,
} from '#/lib/server/functions/organization.functions'
import { getPresignedPutUrlService } from '#/lib/server/services/minio.services'
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
  imageFile?: File
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
  mutationFn: async ({ name, identifier, visibility, imageFile }) => {
    const organizationResource = await createOrganizationResource({
      data: {
        name,
        identifier,
        visibility,
      },
    })

    if (organizationResource.success) {
      let imageFileId: string | undefined = undefined

      if (imageFile) {
        const organizationDetails = await getOrganizationDetails({
          data: { id: organizationResource.data.organization.id },
        })
        if (organizationDetails.success) {
          const avatarUploadPresignedUrl = await getPresignedPutUrlService({
            bucketId: organizationDetails.data.organization.storageBucketId,
            extension: imageFile.name.slice(
              ((imageFile.name.lastIndexOf('.') - 1) >>> 0) + 2,
            ),
            originalName: imageFile.name,
          })

          const res = await fetch(avatarUploadPresignedUrl.url, {
            method: 'PUT',
            body: imageFile,
          })

          if (!res.ok) {
            await selfOrganizationCollection.utils.awaitTxId(
              organizationDetails.data.txid,
            )
            toast.error('Image File Not Uploaded')
            return
          }

          const fileResource = await createFileResource({
            data: {
              originalName: imageFile.name,
              extension: imageFile.name.slice(
                ((imageFile.name.lastIndexOf('.') - 1) >>> 0) + 2,
              ),
              sizeBytes: imageFile.size,
              storageBucketId:
                organizationDetails.data.organization.storageBucketId,
              storageKey: avatarUploadPresignedUrl.objectName,
              ownerResourceId: organizationDetails.data.organization.id,
              visibility: 'public',
            },
          })

          if (fileResource.success) {
            imageFileId = fileResource.data.file.id
          } else {
            await selfOrganizationCollection.utils.awaitTxId(
              fileResource.data?.txid || 0,
            )
            toast.error('Image File Not Uploaded')
          }

          const updatedOrganizationResource = await updateOrganizationResource({
            data: {
              id: organizationDetails.data.organization.id,
              imageFileId,
            },
          })

          await selfOrganizationCollection.utils.awaitTxId(
            updatedOrganizationResource.data?.txid || 0,
          )
          toast.success('Organization Created')
        } else {
          await selfOrganizationCollection.utils.awaitTxId(
            organizationDetails.data?.txid || 0,
          )
          toast.error(organizationDetails.error)
        }
      } else {
        await selfOrganizationCollection.utils.awaitTxId(
          organizationResource.data.txid,
        )
        toast.success('Organization Created')
      }
    } else {
      await selfOrganizationCollection.utils.awaitTxId(
        organizationResource.data?.txid || 0,
      )
      toast.error(organizationResource.error, {
        description: organizationResource.data?.permissionsRequired,
      })
    }
  },
})

export const updateOrganizationResourceAction = createOptimisticAction<{
  id: string
  name?: string
  identifier?: string
  imageFile?: File
  visibility?: Visibility
}>({
  onMutate: ({ id, name, identifier }) => {
    selfOrganizationCollection.update(id, (item) => {
      if (name) item.name = name
      if (identifier) item.identifier = identifier
    })
  },
  mutationFn: async ({ id, name, identifier, visibility, imageFile }) => {
    let imageFileId: string | undefined = undefined

    if (imageFile) {
      const organizationDetails = await getOrganizationDetails({
        data: { id },
      })
      if (organizationDetails.success) {
        const avatarUploadPresignedUrl = await getPresignedPutUrlService({
          bucketId: organizationDetails.data.organization.storageBucketId,
          extension: imageFile.name.slice(
            ((imageFile.name.lastIndexOf('.') - 1) >>> 0) + 2,
          ),
          originalName: imageFile.name,
        })

        const res = await fetch(avatarUploadPresignedUrl.url, {
          method: 'PUT',
          body: imageFile,
        })

        if (!res.ok) {
          await selfOrganizationCollection.utils.awaitTxId(
            organizationDetails.data.txid,
          )
          toast.error('Image File Not Uploaded')
          return
        }

        const fileResource = await createFileResource({
          data: {
            originalName: imageFile.name,
            extension: imageFile.name.slice(
              ((imageFile.name.lastIndexOf('.') - 1) >>> 0) + 2,
            ),
            sizeBytes: imageFile.size,
            storageBucketId:
              organizationDetails.data.organization.storageBucketId,
            storageKey: avatarUploadPresignedUrl.objectName,
            ownerResourceId: organizationDetails.data.organization.id,
            visibility: 'public',
          },
        })

        if (fileResource.success) {
          imageFileId = fileResource.data.file.id
        } else {
          await selfOrganizationCollection.utils.awaitTxId(
            fileResource.data?.txid || 0,
          )
          toast.error('Image File Not Uploaded')
        }
      }
    }

    const organizationResource = await updateOrganizationResource({
      data: {
        id,
        name,
        identifier,
        visibility,
        imageFileId,
      },
    })
    if (organizationResource.success) {
      await selfOrganizationCollection.utils.awaitTxId(
        organizationResource.data.txid,
      )
      toast.success('Organization Updated')
    } else {
      await selfOrganizationCollection.utils.awaitTxId(
        organizationResource.data?.txid || 0,
      )
      toast.error(organizationResource.error, {
        description: organizationResource.data?.permissionsRequired,
      })
    }
  },
})

export const deleteOrganizationResourceAction = createOptimisticAction<{
  id: string
}>({
  onMutate: ({ id }) => {
    selfOrganizationCollection.delete(id)
  },
  mutationFn: async ({ id }) => {
    const deletedOrganization = await deleteOrganizationResource({
      data: { id },
    })

    if (deletedOrganization.success) {
      await selfOrganizationCollection.utils.awaitTxId(
        deletedOrganization.data.txid,
      )
      toast.success('Organization Updated')
    } else {
      await selfOrganizationCollection.utils.awaitTxId(
        deletedOrganization.data?.txid || 0,
      )
      toast.error(deletedOrganization.error, {
        description: deletedOrganization.data?.permissionsRequired,
      })
    }
  },
})
