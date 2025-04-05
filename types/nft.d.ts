declare interface NFTClassMetadata {
  'url': string
  'name': string
  '@type': string
  'image': string
  'version': number
  '@context': string
  'keywords': string
  'usageInfo': string
  'description': string
  'nft_meta_collection_id': string
  'nft_meta_collection_name': string
  'nft_meta_collection_descrption': string // NOTE: Typo
}

declare interface NFTClass {
  id: string
  name: string
  description: string
  symbol: string
  uri: string
  uri_hash: string
  metadata: NFTClassMetadata
  parent: {
    type: string
    iscn_id_prefix: string
    account: string
  }
  created_at: string
  latest_price: number
  price_updated_at: string
  owner: string
  nft_owned_count: number
  nft_last_owned_at: string
  last_owned_nft_id: string
}

declare type NFTId = string
declare type NFTIdList = NFTId[]
declare interface NFTOwner {
  owner: string
  count: number
  nfts: NFTIdList
}
