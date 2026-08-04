import { useMediaQuery } from '@vueuse/core'

export const STAKING_SORT_TAG_PREFIX = 'staking-'

interface StoreTagsOptions {
  routeName: Ref<string>
  isLibraryTab: Ref<boolean>
  // Default true. Product routes pass false: when ?tag= is absent,
  // tagId resolves to '' so no pill is highlighted.
  shouldFallbackToDefaultTag?: MaybeRefOrGetter<boolean>
  // Default true. Product routes pass false so their query params
  // (ll_source etc.) don't leak into listing URLs on tag click.
  shouldPreserveQuery?: MaybeRefOrGetter<boolean>
}

// Tag selector state for the store/library listing page: staking sort tabs,
// CMS tags, the tag route query, and tag-derived labels.
export function useStoreTags({
  routeName,
  isLibraryTab,
  shouldFallbackToDefaultTag = true,
  shouldPreserveQuery = true,
}: StoreTagsOptions) {
  const { t: $t, locale } = useI18n()
  const localeRoute = useLocaleRoute()
  const route = useRoute()
  const getRouteQuery = useRouteQuery()
  const queryCache = useQueryCache()
  const { loggedIn: hasLoggedIn } = useUserSession()
  const isMobile = useMediaQuery('(max-width: 425px)')

  const STAKING_SORT_OPTIONS = [
    { value: 'total-staked', isPublic: true },
    { value: 'staker-count' },
    { value: 'recent' },
  ].map(option => ({
    ...option,
    isPublic: !!option.isPublic,
    value: `${STAKING_SORT_TAG_PREFIX}${option.value}`,
  }))
  const STAKING_TAG_DEFAULT = STAKING_SORT_OPTIONS[0]!.value
  // The library always lands on the usage-ranked (熱門) tab regardless of login status.
  // On the store, signed-in readers land on their personalized feed while signed-out
  // visitors get the staking-ranked landing as the default tab.
  const defaultTagId = computed(() => {
    if (isLibraryTab.value) return BOOKSTORE_POPULAR_LIST_TYPE
    return hasLoggedIn.value ? BOOKSTORE_FOR_YOU_LIST_TYPE : STAKING_TAG_DEFAULT
  })

  function getIsDefaultTagId(id: string) {
    return id === defaultTagId.value
  }

  function getIsLocalHistoriesTagId(id: string) {
    return id === 'local-histories'
  }

  function getIsStakingTagId(id: string) {
    return id.startsWith(STAKING_SORT_TAG_PREFIX)
  }

  function getIsForYouTagId(id: string) {
    return id === BOOKSTORE_FOR_YOU_LIST_TYPE
  }

  // Strict tab separation: a tag only belongs to the tab it's flagged for,
  // so a cross-tab deep link (e.g. /library?tag=<store-only tag>) resolves to the default.
  function getIsTagIdValidForTab(id: string) {
    // The tab's default tag is always valid.
    if (getIsDefaultTagId(id)) return true
    // The personalized feed is logged-in only; guest deep links resolve to the default.
    if (getIsForYouTagId(id)) return hasLoggedIn.value
    // Staking sort and local histories are store-only entries.
    if (getIsStakingTagId(id) || getIsLocalHistoriesTagId(id)) return !isLibraryTab.value
    // CMS tags must carry the flag matching the current tab.
    // Unknown tags (not yet loaded) are treated as valid until their data arrives to avoid a false redirect.
    const tag = getBookstoreCMSTagByIdFromCache(queryCache, id)
    if (!tag) return true
    return isLibraryTab.value ? tag.isForLibrary : tag.isForStore
  }

  const fallbackTagId = computed(() =>
    toValue(shouldFallbackToDefaultTag) ? defaultTagId.value : '')

  const tagId = computed({
    get: () => {
      const id = getRouteQuery('tag', '')
      if (!id) return fallbackTagId.value
      return getIsTagIdValidForTab(id) ? id : fallbackTagId.value
    },
    set: async (id) => {
      if (getIsLocalHistoriesTagId(id)) {
        await navigateTo(localeRoute({ name: 'local-histories' }))
        return
      }
      await navigateTo(localeRoute({
        name: routeName.value,
        query: {
          ...(toValue(shouldPreserveQuery) ? route.query : {}),
          ll_medium: `tag-${id}`,
          // NOTE: Remove the tag query if it is the listing tag
          tag: getIsDefaultTagId(id) ? undefined : id,
        },
      }))
    },
  })
  const isDefaultTagId = computed(() => getIsDefaultTagId(tagId.value))
  const isStakingTagId = computed(() => getIsStakingTagId(tagId.value))
  const isPopularTagId = computed(() => tagId.value === BOOKSTORE_POPULAR_LIST_TYPE)
  const isBestsellingTagId = computed(() => tagId.value === BOOKSTORE_BESTSELLING_LIST_TYPE)
  const isForYouTagId = computed(() => getIsForYouTagId(tagId.value))

  const normalizedLocale = computed(() => locale.value === 'zh-Hant' ? 'zh' : 'en')

  function getStakingTagLabel(tagId: string) {
    const suffix = tagId.slice(STAKING_SORT_TAG_PREFIX.length) || 'total-staked'
    switch (suffix) {
      case 'staker-count':
        return $t('staking_explore_sort_staker_count')
      case 'recent':
        return $t('staking_explore_sort_recent')
      case 'total-staked':
      default:
        return $t('staking_explore_sort_total_staked')
    }
  }

  const activeCMSTag = computed(() => {
    return getBookstoreCMSTagByIdFromCache(queryCache, tagId.value)
  })

  function getTagTo(value: string) {
    if (value === 'local-histories') {
      return localeRoute({ name: 'local-histories' })
    }
    return localeRoute({
      name: routeName.value,
      query: {
        ...(toValue(shouldPreserveQuery) ? route.query : {}),
        tag: getIsDefaultTagId(value) ? undefined : value,
      },
    })
  }

  const allTagItems = computed(() => {
    // The personalized feed needs a session; guests never see the pill.
    const forYouTags = hasLoggedIn.value
      ? [{ label: $t('store_tag_for_you'), value: BOOKSTORE_FOR_YOU_LIST_TYPE }]
      : []

    // Stake ranking is a storefront signal; the library ranks by reading instead.
    const stakingTags = isLibraryTab.value
      ? []
      : STAKING_SORT_OPTIONS
          .map(option => ({
            ...option,
            label: getStakingTagLabel(option.value),
          }))
          .filter(option => tagId.value === option.value || option.isPublic)

    // Built-in list types (latest/free/drm-free) are mirrored as CMS tags so editors
    // control their ordering here, hence they surface through cmsTags like any other tag.
    const cmsTags = getBookstoreCMSTagsFromCache(queryCache)
      .filter((tag) => {
        // Always surface the active tag, even if it isn't flagged for this tab.
        if (tag.id === tagId.value) return true
        // Each tab only lists tags flagged for it (isForLibrary / isForStore).
        if (!(isLibraryTab.value ? tag.isForLibrary : tag.isForStore)) return false
        return !!tag.isPublic
      })
      .map(tag => ({
        label: tag.name[normalizedLocale.value],
        value: tag.id,
      }))

    // Always surface the active CMS tag even if it's absent from the cached list
    // (e.g. a newly created tag not yet reflected in the cached tag list).
    if (
      activeCMSTag.value
      && !cmsTags.some(t => t.value === activeCMSTag.value!.id)
    ) {
      cmsTags.push({
        label: activeCMSTag.value.name[normalizedLocale.value],
        value: activeCMSTag.value.id,
      })
    }

    // Local histories is a store-only entry; the library tab omits it.
    const visibleCMSTags = isLibraryTab.value
      ? cmsTags.filter(tag => !getIsLocalHistoriesTagId(tag.value))
      : cmsTags

    // On mobile, pin the local-histories CMS tag last.
    const ordered = [...forYouTags, ...stakingTags, ...visibleCMSTags]
    if (isMobile.value) {
      const localHistoriesIndex = ordered.findIndex(tag => getIsLocalHistoriesTagId(tag.value))
      if (localHistoriesIndex !== -1) {
        ordered.push(...ordered.splice(localHistoriesIndex, 1))
      }
    }

    return ordered.map(item => ({
      ...item,
      to: getTagTo(item.value),
    }))
  })

  function mapTagIdToAPIStakingSortValue(tagId: string): 'staked_amount' | 'last_staked_at' | 'number_of_stakers' {
    const suffix = tagId.slice(STAKING_SORT_TAG_PREFIX.length) || 'total-staked'
    switch (suffix) {
      case 'staker-count':
        return 'number_of_stakers'
      case 'recent':
        return 'last_staked_at'
      case 'total-staked':
      default:
        return 'staked_amount'
    }
  }

  const tagName = computed(() => {
    if (isStakingTagId.value) {
      return getStakingTagLabel(tagId.value)
    }
    return activeCMSTag.value?.name[normalizedLocale.value] || ''
  })

  return {
    STAKING_TAG_DEFAULT,
    tagId,
    isDefaultTagId,
    isStakingTagId,
    isPopularTagId,
    isBestsellingTagId,
    isForYouTagId,
    getIsLocalHistoriesTagId,
    normalizedLocale,
    activeCMSTag,
    allTagItems,
    mapTagIdToAPIStakingSortValue,
    tagName,
  }
}
