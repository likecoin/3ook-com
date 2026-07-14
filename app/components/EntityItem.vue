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
        :ui="{ base: 'pr-4 rounded-3xl', label: 'text-wrap' }"
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
  isLibrary: {
    type: Boolean,
    default: false,
  },
})

const localeRoute = useLocaleRoute()

// Gate the fetch on viewport: these render in long lists, so an eager query per
// item would fan out one profile request per row on mount.
const { isVisible } = useVisibility('lazyLoadTrigger')

const likerInfoQuery = useLikerInfoByWalletAddressQuery(
  () => props.walletAddress,
  { enabled: isVisible },
)

const displayName = computed(() => {
  return likerInfoQuery.data.value?.displayName || props.name
})

const avatar = computed(() => {
  return likerInfoQuery.data.value?.avatarSrc || defaultAvatar
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
    name: props.isLibrary ? 'library' : 'store',
    query,
  })
})
</script>
