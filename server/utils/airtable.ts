function normalizeTagIdForViewName(viewName: string) {
  switch (viewName) {
    case 'landing':
      return 'Landing Page'
    case 'listing-zh':
      return 'Listing Page (Chinese)'
    case 'listing-en':
      return 'Listing Page (English)'
    case 'all':
      return 'All'
    default:
      return viewName
  }
}

export interface FetchAirtableCMSProductsByTagIdResponseData {
  records: Array<{
    id: string
    createdTime: string
    fields: {
      'Key'?: string
      'Publications'?: string[]
      'Liker Land URL'?: string[]
      'Image'?: Array<{
        id: string
        width: number
        height: number
        url: string
        filename: string
        size: number
        type: string
        thumbnails?: {
          small?: {
            url: string
            width: number
            height: number
          }
          large?: {
            url: string
            width: number
            height: number
          }
          full?: {
            url: string
            width: number
            height: number
          }
        }
      }>
      'Names'?: string[]
      'Locales'?: string[]
      'IDs'?: string[]
      'Image URLs'?: string[]
      'Publication Count'?: number
      'ID'?: string
      'Image URL'?: string
      'Name'?: string
      'Min Price'?: number
      'Listing Date'?: string[]
      'Timestamp'?: number
      'DRM-free'?: number // 0 = false, 1 = true
      'Sales Count'?: number
      'Chain'?: string[]
      'Calculation'?: boolean
    }
  }>
  offset: string
}

export async function fetchAirtableCMSProductsByTagId(
  tagId: string,
  { pageSize = 100, offset }: { pageSize?: number, offset?: string } = {},
) {
  const config = useRuntimeConfig()
  const results = await $fetch<FetchAirtableCMSProductsByTagIdResponseData>(
    `https://api.airtable.com/v0/${config.public.airtableCMSBaseId}/${config.public.airtableCMSProductsTableId}`,
    {
      headers: {
        Authorization: `Bearer ${config.airtableAPISecret}`,
      },
      params: {
        filterByFormula: 'AND(NOT(Hidden), Chain = "evm")',
        pageSize,
        view: normalizeTagIdForViewName(tagId),
        offset,
      },
    },
  )

  const normalizedRecords = results.records.map(({ id, fields }) => {
    const classId = fields.ID
    const classIds = fields.IDs
    const title = fields.Name
    const titles = fields.Names
    const imageUrl = fields['Image URL']
    const imageUrls = fields['Image URLs']
    const locales = fields.Locales
    const isDRMFree = !!fields['DRM-free']
    const timestamp = fields.Timestamp
    const minPrice = fields['Min Price']
    const isMultiple = classIds && classIds.length > 1
    return {
      id,
      classId,
      classIds: isMultiple ? classIds : undefined,
      title,
      titles: isMultiple ? titles : undefined,
      imageUrl,
      imageUrls: isMultiple ? imageUrls : undefined,
      locales,
      isDRMFree,
      isMultiple: isMultiple ? true : undefined,
      minPrice,
      timestamp,
    }
  })

  return {
    records: normalizedRecords,
    offset: results.offset,
  }
}
