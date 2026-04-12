import { createCollection } from '@tanstack/react-db'
import { electricCollectionOptions } from '@tanstack/electric-db-collection'
import z from 'zod'
import { getElectricUrl } from '#/lib/utils/electric'
import { snakeCamelMapper } from '@electric-sql/client'

export const organizationCollection = createCollection(
  electricCollectionOptions({
    shapeOptions: {
      url: `${getElectricUrl()}/self-organizations`,
      parser: { timestamptz: (date: string) => new Date(date) },
      columnMapper: snakeCamelMapper(),
    },
    schema: z.object({ id: z.string(), crea: z.date() }),
    getKey: (item) => item.id,
  }),
)
