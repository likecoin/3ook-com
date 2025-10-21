<template>
  <UTooltip
    :text="props.walletAddress"
    :disabled="!props.walletAddress || !!displayName"
  >
    <NuxtLink
      :to="linkRoute"
      :class="linkRoute ? 'inline-block' : 'inline'"
    >
      <TagItem
        ref="lazyLoadTrigger"
        :label="label"
        :class="linkRoute ? 'hover:bg-gray-100 transition-colors cursor-pointer' : ''"
      >
        <template #prepend>
          <UAvatar
            :alt="name"
            size="xs"
            icon="i-material-symbols-person-2-rounded"
          />
        </template>
      </TagItem>
    </NuxtLink>
  </UTooltip>
</template>

<script setup lang="ts">
const props = defineProps({
  name: {
    type: String,
    default: '',
  },
  walletAddress: {
    type: String,
    default: '',
  },
  entityType: {
    type: String as PropType<'author' | 'publisher'>,
    default: 'author',
  },
})

const localeRoute = useLocaleRoute()
const metadataStore = useMetadataStore()

useVisibility('lazyLoadTrigger', (visible) => {
  if (visible) {
    if (props.walletAddress) {
      metadataStore.lazyFetchLikerInfoByWalletAddress(props.walletAddress).catch(() => {
        console.warn(`Failed to fetch Liker info of the wallet [${props.walletAddress}]`)
      })
    }
  }
})

const displayName = computed(() => {
  const likerInfo = metadataStore.getLikerInfoByWalletAddress(props.walletAddress)
  return likerInfo?.displayName || props.name
})

const label = computed(() => {
  if (displayName.value) return displayName.value
  return shortenWalletAddress(props.walletAddress)
})

const linkRoute = computed(() => {
  const query = props.entityType === 'author'
    ? {
        author: props.name,
        ll_medium: 'author-link',
        ll_source: 'product-page',
      }
    : {
        publisher: props.name,
        ll_medium: 'publisher-link',
        ll_source: 'product-page',
      }

  return localeRoute({
    name: 'store',
    query,
  })
})
</script>
