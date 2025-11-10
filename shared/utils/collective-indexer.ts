// Collective Indexer API Types
export interface CollectiveStaking {
  book_nft: string
  account: string
  pool_share: string
  staked_amount: string
  pending_reward_amount: string
  claimed_reward_amount: string
}

export interface CollectiveAccount {
  evm_address: string
  staked_amount: string
  pending_reward_amount: string
  claimed_reward_amount: string
}

export interface CollectiveBookNFT {
  evm_address: string
  staked_amount: string
  last_staked_at: string | null
  number_of_stakers: number
}

export interface CollectiveBookNFTStakeDelta {
  book_nft: string
  staked_amount: string
  last_staked_at: string
  number_of_stakers: number
}

export interface CollectiveAccountBookNFT {
  evm_address: string
  pool_share: number
  staked_amount: string
  pending_reward_amount: string
  claimed_reward_amount: string
}

export interface CollectiveStakingEventBase {
  event_type: 'staked' | 'unstaked' | 'reward-added' | 'reward-claimed' | 'reward-deposited' | 'all-rewards-claimed'
  datetime: string
}

export interface CollectiveStakingEventStaked extends CollectiveStakingEventBase {
  event_type: 'staked'
  book_nft: string
  amount: string
}

export interface CollectiveStakingEventUnstaked extends CollectiveStakingEventBase {
  event_type: 'unstaked'
  book_nft: string
  amount: string
}

export interface CollectiveStakingEventRewardAdded extends CollectiveStakingEventBase {
  event_type: 'reward-added'
  book_nft: string
  amount: string
}

export interface CollectiveStakingEventRewardClaimed extends CollectiveStakingEventBase {
  event_type: 'reward-claimed'
  book_nft: string
  amount: string
}

export interface CollectiveStakingEventRewardDeposited extends CollectiveStakingEventBase {
  event_type: 'reward-deposited'
  book_nft: string
  amount: string
}

export interface CollectiveStakingEventAllRewardsClaimed extends CollectiveStakingEventBase {
  event_type: 'all-rewards-claimed'
  claimed_amount_list: Array<{
    book_nft: string
    amount: string
    datetime: string
  }>
}

export type CollectiveStakingEvent =
  | CollectiveStakingEventStaked
  | CollectiveStakingEventUnstaked
  | CollectiveStakingEventRewardAdded
  | CollectiveStakingEventRewardClaimed
  | CollectiveStakingEventRewardDeposited
  | CollectiveStakingEventAllRewardsClaimed

export interface CollectivePaginationResponse<T> {
  data: T[]
  pagination: {
    next_key: number
    count: number
  }
}

export interface CollectiveEventQueryResponse<T> {
  data: T[]
  meta: {
    chain_ids: number[]
    address: string
    signature: string
    page: number
    limit_per_chain: number
    total_items: number
    total_pages: number
  }
}

function getCollectiveIndexerAPIFetch() {
  const config = useRuntimeConfig()
  return $fetch.create({ baseURL: config.public.likeCoinEVMChainCollectiveAPIEndpoint })
}

export interface CollectiveQueryOptions {
  'pagination.key'?: number
  'pagination.limit'?: number
  'reverse'?: boolean
  'filter_book_nft_in'?: string[]
  'filter_account_in'?: string[]
}

export interface CollectiveSortedBookNFTsQueryOptions {
  'sort_by'?: 'staked_amount' | 'last_staked_at' | 'number_of_stakers'
  'sort_order'?: 'asc' | 'desc'
  'pagination.limit'?: number
  'pagination.page'?: number
}

export interface CollectiveAccountBookNFTsQueryOptions extends CollectiveQueryOptions {
  sort_by?: 'pool_share' | 'staked_amount' | 'pending_reward_amount'
  sort_order?: 'asc' | 'desc'
}

export interface CollectiveStakingEventsQueryOptions extends CollectiveQueryOptions {
  filter_datetime_from?: string
  filter_datetime_to?: string
}

function getCollectiveQueryOptions(options: CollectiveQueryOptions = {}) {
  const query: Record<string, string | string[]> = {}
  if (options['pagination.key']) query['pagination.key'] = options['pagination.key'].toString()
  if (options['pagination.limit']) query['pagination.limit'] = options['pagination.limit'].toString()
  if (options.reverse !== undefined) query.reverse = options.reverse.toString()
  if (options.filter_book_nft_in) query.filter_book_nft_in = options.filter_book_nft_in
  if (options.filter_account_in) query.filter_account_in = options.filter_account_in
  return query
}

function getCollectiveSortedBookNFTsQueryOptions(options: Partial<CollectiveSortedBookNFTsQueryOptions> = {}) {
  const query: Record<string, string | string[]> = {}
  if (options['pagination.limit']) query['pagination.limit'] = options['pagination.limit'].toString()
  if (options['pagination.page']) query['pagination.page'] = options['pagination.page'].toString()
  query.sort_by = options.sort_by || 'staked_amount'
  query.sort_order = options.sort_order || 'desc'
  return query
}

function getCollectiveAccountBookNFTsQueryOptions(options: CollectiveAccountBookNFTsQueryOptions = {}) {
  const query = getCollectiveQueryOptions(options)
  if (options.sort_by) query.sort_by = options.sort_by
  if (options.sort_order) query.sort_order = options.sort_order
  return query
}

function getCollectiveStakingEventsQueryOptions(options: CollectiveStakingEventsQueryOptions = {}) {
  const query = getCollectiveQueryOptions(options)
  if (options.filter_datetime_from) query.filter_datetime_from = options.filter_datetime_from
  if (options.filter_datetime_to) query.filter_datetime_to = options.filter_datetime_to
  return query
}

// Staking endpoints
export function fetchCollectiveStakings(options: CollectiveQueryOptions = {}) {
  const fetch = getCollectiveIndexerAPIFetch()
  return fetch<CollectivePaginationResponse<CollectiveStaking>>('/stakings', {
    query: getCollectiveQueryOptions(options),
  })
}

export function fetchCollectiveAccountStakings(
  address: string,
  options: CollectiveQueryOptions = {},
) {
  const fetch = getCollectiveIndexerAPIFetch()
  return fetch<CollectivePaginationResponse<CollectiveStaking>>(`/account/${address}/stakings`, {
    query: getCollectiveQueryOptions(options),
  })
}

export function fetchCollectiveBookNFTStakings(
  address: string,
  options: CollectiveQueryOptions = {},
) {
  const fetch = getCollectiveIndexerAPIFetch()
  return fetch<CollectivePaginationResponse<CollectiveStaking>>(`/book-nft/${address}/stakings`, {
    query: getCollectiveQueryOptions(options),
  })
}

// Account endpoints
export function fetchCollectiveAccounts(options: CollectiveQueryOptions = {}) {
  const fetch = getCollectiveIndexerAPIFetch()
  return fetch<CollectivePaginationResponse<CollectiveAccount>>('/accounts', {
    query: getCollectiveQueryOptions(options),
  })
}

export function fetchCollectiveAccount(address: string, options: CollectiveQueryOptions = {}) {
  const fetch = getCollectiveIndexerAPIFetch()
  return fetch<CollectiveAccount>(`/account/${address}`, {
    query: getCollectiveQueryOptions(options),
  })
}

export function fetchCollectiveAccountBookNFTs(
  address: string,
  options: CollectiveAccountBookNFTsQueryOptions = {},
) {
  const fetch = getCollectiveIndexerAPIFetch()
  return fetch<CollectivePaginationResponse<CollectiveAccountBookNFT>>(`/account/${address}/book-nfts`, {
    query: getCollectiveAccountBookNFTsQueryOptions(options),
  })
}

export function fetchCollectiveAccountStakingEvents(
  address: string,
  eventType: 'staked' | 'unstaked' | 'reward-added' | 'reward-claimed' | 'reward-deposited' | 'all' = 'all',
  options: CollectiveStakingEventsQueryOptions = {},
) {
  const fetch = getCollectiveIndexerAPIFetch()
  return fetch<CollectivePaginationResponse<CollectiveStakingEvent>>(`/account/${address}/staking-events/${eventType}`, {
    query: getCollectiveStakingEventsQueryOptions(options),
  })
}

// BookNFT endpoints
export function fetchCollectiveBookNFTs(options: CollectiveQueryOptions = {}) {
  const fetch = getCollectiveIndexerAPIFetch()
  return fetch<CollectivePaginationResponse<CollectiveBookNFT>>('/book-nfts', {
    query: getCollectiveQueryOptions(options),
  })
}

export function fetchCollectiveSortedBookNFTs(
  timeFrame: '7d' | '30d' | '1y' = '1y',
  options: CollectiveSortedBookNFTsQueryOptions = { sort_by: 'staked_amount' },
) {
  const fetch = getCollectiveIndexerAPIFetch()
  return fetch<CollectivePaginationResponse<CollectiveBookNFTStakeDelta>>(`/book-nfts/${timeFrame}/delta`, {
    query: getCollectiveSortedBookNFTsQueryOptions(options),
  })
}

export function fetchCollectiveBookNFT(address: string, options: CollectiveQueryOptions = {}) {
  const fetch = getCollectiveIndexerAPIFetch()
  return fetch<CollectiveBookNFT>(`/book-nft/${address}`, {
    query: getCollectiveQueryOptions(options),
  })
}

export function fetchCollectiveBookNFTStakingEvents(
  address: string,
  eventType: 'staked' | 'unstaked' | 'reward-added' | 'reward-claimed' | 'reward-deposited' | 'all' = 'all',
  options: CollectiveStakingEventsQueryOptions = {},
) {
  const fetch = getCollectiveIndexerAPIFetch()
  return fetch<CollectivePaginationResponse<CollectiveStakingEvent>>(`/book-nft/${address}/staking-events/${eventType}`, {
    query: getCollectiveStakingEventsQueryOptions(options),
  })
}

// Events endpoint
export interface CollectiveEventsQueryOptions {
  limit?: number
  page?: number
  sort_by?: 'block_number' | 'block_timestamp'
  sort_order?: 'asc' | 'desc'
  filter_block_timestamp?: string
  filter_block_timestamp_gte?: string
  filter_block_timestamp_gt?: string
  filter_block_timestamp_lte?: string
  filter_block_timestamp_lt?: string
  filter_topic_0?: string
  filter_topic_1?: string
  filter_topic_2?: string
  filter_topic_3?: string
}

function getCollectiveEventsQueryOptions(options: CollectiveEventsQueryOptions = {}) {
  const query: Record<string, string> = {}
  if (options.limit) query.limit = options.limit.toString()
  if (options.page) query.page = options.page.toString()
  if (options.sort_by) query.sort_by = options.sort_by
  if (options.sort_order) query.sort_order = options.sort_order
  if (options.filter_block_timestamp) query.filter_block_timestamp = options.filter_block_timestamp
  if (options.filter_block_timestamp_gte) query.filter_block_timestamp_gte = options.filter_block_timestamp_gte
  if (options.filter_block_timestamp_gt) query.filter_block_timestamp_gt = options.filter_block_timestamp_gt
  if (options.filter_block_timestamp_lte) query.filter_block_timestamp_lte = options.filter_block_timestamp_lte
  if (options.filter_block_timestamp_lt) query.filter_block_timestamp_lt = options.filter_block_timestamp_lt
  if (options.filter_topic_0) query.filter_topic_0 = options.filter_topic_0
  if (options.filter_topic_1) query.filter_topic_1 = options.filter_topic_1
  if (options.filter_topic_2) query.filter_topic_2 = options.filter_topic_2
  if (options.filter_topic_3) query.filter_topic_3 = options.filter_topic_3
  return query
}

export interface CollectiveEvent {
  chain_id: number
  block_number: string
  block_hash: string
  block_timestamp: string
  transaction_hash: string
  transaction_index: number
  log_index: number
  address: string
  data: string
  topics: string[]
  decoded: {
    name: string
    signature: string
    indexed_params: Record<string, unknown>
    non_indexed_params: Record<string, unknown>
  }
}

export function fetchCollectiveEvents(options: CollectiveEventsQueryOptions = {}) {
  const fetch = getCollectiveIndexerAPIFetch()
  return fetch<CollectiveEventQueryResponse<CollectiveEvent>>('/events', {
    query: getCollectiveEventsQueryOptions(options),
  })
}

export function fetchCollectiveEventsForContract(address: string, options: CollectiveEventsQueryOptions = {}) {
  const fetch = getCollectiveIndexerAPIFetch()
  return fetch<CollectiveEventQueryResponse<CollectiveEvent>>(`/events/${address}`, {
    query: getCollectiveEventsQueryOptions(options),
  })
}

export function fetchCollectiveEventsForContractSignature(
  address: string,
  signature: string,
  options: CollectiveEventsQueryOptions = {},
) {
  const fetch = getCollectiveIndexerAPIFetch()
  return fetch<CollectiveEventQueryResponse<CollectiveEvent>>(`/events/${address}/${signature}`, {
    query: getCollectiveEventsQueryOptions(options),
  })
}
