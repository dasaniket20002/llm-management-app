import { getPresignedGetUrl } from '#/lib/server/functions/file.functions'
import { queryOptions } from '@tanstack/react-query'

const defaultReturn = {
  url: '',
  storageKey: '',
  expireTime: 0,
}

export const useFilePrefetchLinkQueryOptions = ({
  fileId,
  ownerResourceId,
  staleTime = 60 * 60 * 1000,
}: {
  fileId: string
  ownerResourceId: string
  staleTime?: number
}) =>
  queryOptions({
    queryKey: [`file-${ownerResourceId}-${fileId}`],
    queryFn: async () => {
      if (!fileId) return defaultReturn
      const _avatarUrl = await getPresignedGetUrl({
        data: { fileId, ownerResourceId },
      })
      if (!_avatarUrl.success) return defaultReturn
      return _avatarUrl.data
    },
    initialData: defaultReturn,
    staleTime,
  })
