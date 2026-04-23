import type { Visibility } from '#/lib/server/db/generated/enums'
import {
  createFileResource,
  getPresignedPutUrl,
} from '#/lib/server/functions/file.functions'
import {
  createOrganizationResource,
  deleteOrganizationResource,
  getOrganizationDetails,
  updateOrganizationResource,
} from '#/lib/server/functions/organization.functions'
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
  imageFile?: File | null
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
    if (!organizationResource.success) {
      await selfOrganizationCollection.utils.awaitTxId(
        organizationResource.data?.txid || 0,
      )
      toast.error(organizationResource.error, {
        description: organizationResource.data?.permissionsRequired,
      })
      return
    }

    if (imageFile) {
      const lastDot = imageFile.name.lastIndexOf('.')
      const filename = imageFile.name.slice(0, lastDot)
      const fileext = imageFile.name.slice(lastDot + 1)

      const avatarUploadPresignedUrl = await getPresignedPutUrl({
        data: {
          ownerResourceId: organizationResource.data.organization.id,
          originalName: filename,
          extension: fileext,
        },
      })
      if (!avatarUploadPresignedUrl.success) {
        await selfOrganizationCollection.utils.awaitTxId(
          organizationResource.data.txid,
        )
        toast.error('Image File Not Uploaded')
        return
      }

      const res = await fetch(avatarUploadPresignedUrl.data.url, {
        method: 'PUT',
        body: imageFile,
      })

      if (!res.ok) {
        await selfOrganizationCollection.utils.awaitTxId(
          organizationResource.data.txid,
        )
        toast.error('Image File Not Uploaded')
        return
      }

      const organizationDetails = await getOrganizationDetails({
        data: {
          id: organizationResource.data.organization.id,
        },
      })

      if (!organizationDetails.success) {
        await selfOrganizationCollection.utils.awaitTxId(
          organizationResource.data.txid,
        )
        toast.error(organizationDetails.error)
        return
      }

      const fileResource = await createFileResource({
        data: {
          originalName: filename,
          extension: fileext,
          sizeBytes: imageFile.size,
          storageBucketId:
            organizationDetails.data.organization.storageBucketId,
          storageKey: avatarUploadPresignedUrl.data.objectName,
          ownerResourceId: organizationDetails.data.organization.id,
          visibility: 'public',
        },
      })

      if (!fileResource.success) {
        await selfOrganizationCollection.utils.awaitTxId(
          fileResource.data?.txid || 0,
        )
        toast.error('Image File Not Uploaded')
        return
      }

      const updatedOrganizationResource = await updateOrganizationResource({
        data: {
          id: organizationDetails.data.organization.id,
          imageFileId: fileResource.data.file.id,
        },
      })

      await selfOrganizationCollection.utils.awaitTxId(
        updatedOrganizationResource.data?.txid || 0,
      )
      toast.success('Organization Created')
    } else {
      await selfOrganizationCollection.utils.awaitTxId(
        organizationResource.data.txid,
      )
      toast.success('Organization Created')
    }
  },
})

export const updateOrganizationResourceAction = createOptimisticAction<{
  id: string
  name?: string
  identifier?: string
  imageFile?: File | null
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
      const lastDot = imageFile.name.lastIndexOf('.')
      const filename = imageFile.name.slice(0, lastDot)
      const fileext = imageFile.name.slice(lastDot + 1)

      const organizationDetails = await getOrganizationDetails({
        data: { id },
      })
      if (!organizationDetails.success) {
        selfOrganizationCollection.startSyncImmediate()
        toast.error('Image File Not Uploaded')
        return
      }

      const avatarUploadPresignedUrl = await getPresignedPutUrl({
        data: {
          ownerResourceId: organizationDetails.data.organization.id,
          originalName: filename,
          extension: fileext,
        },
      })
      if (!avatarUploadPresignedUrl.success) {
        selfOrganizationCollection.startSyncImmediate()
        toast.error('Image File Not Uploaded')
        return
      }

      const res = await fetch(avatarUploadPresignedUrl.data.url, {
        method: 'PUT',
        body: imageFile,
      })

      if (!res.ok) {
        selfOrganizationCollection.startSyncImmediate()
        toast.error('Image File Not Uploaded')
        return
      }

      const fileResource = await createFileResource({
        data: {
          originalName: filename,
          extension: fileext,
          sizeBytes: imageFile.size,
          storageBucketId:
            organizationDetails.data.organization.storageBucketId,
          storageKey: avatarUploadPresignedUrl.data.objectName,
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
        return
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
      toast.success('Organization Deleted')
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
