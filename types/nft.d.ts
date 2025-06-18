declare interface NFTClassMetadata {
  name: string
  symbol: string
  description: string
  image: string
  banner_image: string
  featured_image: string
  external_link: string
  ['@type']: string
  author: string | { name: string, description: string }
  nft_meta_collection_description: string
  nft_meta_collection_id: string
  publicationDate: string
  publisher: string
  recordTimestamp: string
  thumbnailUrl: string
  usageInfo: string
  downloadableUrls: {
    fileName: string
    type: string
    url: string
  }[]
  isbn: string
  nft_meta_collection_name: string
  sameAs: string[]
  potentialAction?: PotentialAction
  contentFingerprints: string[]
  coverUrl: string
  datePublished: string
  external_url: string
  inLanguage: string
  keywords: string[]
  language: string
  tags: string[]
  title: string
}
declare interface NFTClass {
  address: `0x${string}`
  name: string
  symbol: string
  owner_address: string
  total_supply: string
  max_supply: string
  metadata: NFTClassMetadata
  banner_image: string
  featured_image: string
  deployer_address: string
  deployer_block_number: string
  minted_at: string
  created_at: string
}

declare type NFTAttributeValue = string | number | { [key: string]: string | number }

declare interface NFTAttribute {
  trait_type: string
  value: NFTAttributeValue
  display_type?: string
}

declare interface NFT {
  contract_address: string
  token_id: string
  token_uri: string
  image: string
  image_data: string
  external_url: string
  description: string
  name: string
  attributes: NFTAttribute[]
  background_color: string
  animation_url: string
  youtube_url: string
  owner_address: string
  minted_at: string // ISO date string
  updated_at: string // ISO date string
}

declare interface LegacyNFTClassMetadata {
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

declare interface LegacyNFTClass {
  id: `likenft${string}`
  name: string
  description: string
  symbol: string
  uri: string
  uri_hash: string
  metadata: LegacyNFTClassMetadata
  parent: {
    type: string
    iscn_id_prefix: string
    account: string
  }
  created_at: string // ISO date string
  latest_price: number
  price_updated_at: string // ISO date string
  owner: string
  nft_owned_count: number
  nft_last_owned_at: string // ISO date string
  last_owned_nft_id: string
}

declare type NFTId = string
declare type NFTIdList = NFTId[]
declare interface NFTOwner {
  owner: string
  count: number
  nfts: NFTIdList
}

declare interface ContentURL {
  url: string
  name: string
  type: string
  index: number
}
