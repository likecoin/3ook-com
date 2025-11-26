<template>
  <UTooltip
    :text="props.walletAddress"
    :disabled="!props.walletAddress || !!displayName"
  >
    <span
      v-if="!props.isLinkDisabled"
      ref="lazyLoadTrigger"
    >
      <UButton
        :label="label"
        :to="linkRoute"
        variant="soft"
        size="xl"
        :avatar="{ icon: 'i-material-symbols-person-2-rounded' }"
        :ui="{ base: 'pr-4 rounded-full' }"
      />
    </span>
    <div
      v-else
      ref="lazyLoadTrigger"
      class="flex items-center gap-2"
    >
      <UAvatar
        :alt="name"
        size="xs"
        :src="avatar"
      />
      <span
        class="font-semibold text-highlighted truncate max-w-[160px]"
        v-text="label"
      />
    </div>
  </UTooltip>
</template>

<script setup lang="ts">
import defaultAvatar from '@/assets/images/voice-avatars/default.jpg'

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
  isLinkDisabled: {
    type: Boolean,
    default: false,
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

const avatar = computed(() => {
  const likerInfo = metadataStore.getLikerInfoByWalletAddress(props.walletAddress)
  return likerInfo?.avatarSrc || defaultAvatar
})

const label = computed(() => {
  if (displayName.value) return displayName.value
  return shortenWalletAddress(props.walletAddress)
})

const linkRoute = computed(() => {
  const query = props.entityType === 'author'
    ? {
        q: props.name,
        ll_medium: 'author-link',
        ll_source: 'product-page',
      }
    : {
        q: props.name,
        ll_medium: 'publisher-link',
        ll_source: 'product-page',
      }

  return localeRoute({
    name: 'store',
    query,
  })
})
</script>
