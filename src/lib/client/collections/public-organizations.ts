import { organizationSchema } from '#/lib/types/collection-schemas/organization'
import { getElectricUrl } from '#/lib/utils/electric'
import { snakeCamelMapper } from '@electric-sql/client'
import { electricCollectionOptions } from '@tanstack/electric-db-collection'
import { createCollection } from '@tanstack/react-db'

export const publicOrganizationCollection = createCollection(
  electricCollectionOptions({
    shapeOptions: {
      url: `${getElectricUrl()}/public-organizations`,
      parser: { timestamptz: (date: string) => new Date(date) },
      columnMapper: snakeCamelMapper(),
    },
    schema: organizationSchema,
    getKey: (item) => item.id,
  }),
)
