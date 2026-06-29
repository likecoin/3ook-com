<template>
  <div class="grid sm:grid-cols-2 gap-4">
    <UButton
      :label="$t('app_download_buttons_app_store')"
      icon="i-simple-icons-apple"
      :to="appStoreUrl"
      target="_blank"
      rel="noopener noreferrer"
      color="neutral"
      variant="outline"
      size="lg"
      block
      @click="onClickAppStore"
    />
    <UButton
      :label="$t('app_download_buttons_google_play')"
      icon="i-simple-icons-googleplay"
      :to="googlePlayUrl"
      target="_blank"
      rel="noopener noreferrer"
      color="neutral"
      variant="outline"
      size="lg"
      block
      @click="onClickGooglePlay"
    />
  </div>
</template>

<script setup lang="ts">
import type { AppDownloadPlacement } from '~/composables/use-app-download-urls'

const props = withDefaults(
  defineProps<{
    // Static fallback campaign tag identifying where this CTA lives, used when
    // the session carries no UTM. See useAppDownloadUrls.
    placement?: AppDownloadPlacement
  }>(),
  { placement: 'app_download' },
)

const emit = defineEmits<{
  clickAppStore: []
  clickGooglePlay: []
}>()

const { appStoreUrl, googlePlayUrl } = useAppDownloadUrls(props.placement)

function onClickAppStore() {
  emit('clickAppStore')
}

function onClickGooglePlay() {
  emit('clickGooglePlay')
}
</script>
