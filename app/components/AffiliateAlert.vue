<template>
  <UAlert
    v-if="affiliateId"
    ref="lazyLoadTrigger"
    :class="{ hidden: !affiliateInfo }"
    :description="affiliateInfo ? $t('affiliate_alert_description', { name: affiliateName }) : ''"
    :avatar="affiliateInfo && affiliateAvatarSrc
      ? { src: affiliateAvatarSrc }
      : { icon: 'i-material-symbols-person-2-rounded' }"
    color="neutral"
    variant="subtle"
    :ui="{
      root: 'rounded-2xl items-center py-2',
      avatar: 'w-6 h-6',
      description: 'font-bold',
    }"
  />
</template>

<script setup lang="ts">
const metadataStore = useMetadataStore()
const { t: $t } = useI18n()
const getRouteQuery = useRouteQuery()
const isCacheDisabled = useNoCache()

const from = computed(() => getRouteQuery('from'))

const affiliateId = computed(() => {
  return from.value?.startsWith('@') ? from.value.slice(1) : undefined
})

async function fetchInfo() {
  if (!affiliateId.value) return
  try {
    await metadataStore.lazyFetchLikerInfoById(affiliateId.value, { nocache: isCacheDisabled.value })
  }
  catch {
    console.warn(`Failed to fetch Liker info of the affiliate ID [${affiliateId.value}]`)
  }
}

if (affiliateId.value) {
  await callOnce(affiliateId.value, fetchInfo)
}

watch(affiliateId, async (newId, oldId) => {
  if (newId !== oldId) {
    await fetchInfo()
  }
})

const affiliateInfo = computed(() => {
  return affiliateId.value ? metadataStore.getLikerInfoById(affiliateId.value) : undefined
})

const affiliateName = computed(() => {
  return affiliateInfo.value?.displayName || affiliateInfo.value?.likerId || ''
})

const cacheTs = ref('')

watchImmediate([isCacheDisabled, affiliateInfo], () => {
  cacheTs.value = `${Math.round(Date.now() / 1000)}`
})

const affiliateAvatarSrc = computed(() => {
  const src = affiliateInfo.value?.avatarSrc
  if (isCacheDisabled.value && src) {
    try {
      const url = new URL(src)
      url.searchParams.set('ts', cacheTs.value)
      return url.toString()
    }
    catch {
      // No-op
    }
  }
  return src
})
</script>
