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

const from = computed(() => getRouteQuery('from'))

const affiliateId = computed(() => {
  return from.value?.startsWith('@') ? from.value.slice(1) : undefined
})

async function fetchInfo() {
  if (!affiliateId.value) return
  try {
    await metadataStore.lazyFetchLikerInfoById(affiliateId.value)
  }
  catch {
    console.warn(`Failed to fetch Liker info of the affiliate ID [${affiliateId.value}]`)
  }
}

await callOnce(affiliateId.value, fetchInfo)

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

const affiliateAvatarSrc = computed(() => affiliateInfo.value?.avatarSrc)
</script>
