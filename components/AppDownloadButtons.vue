<template>
  <div class="grid sm:grid-cols-2 gap-4">
    <UButton
      :label="$t('app_download_buttons_app_store')"
      icon="i-simple-icons-apple"
      to="https://apps.apple.com/app/id6757783481"
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
      to="https://play.google.com/store/apps/details?id=land.liker.book3app"
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
const emit = defineEmits<{
  clickAppStore: []
  clickGooglePlay: []
}>()

function onClickAppStore() {
  emit('clickAppStore')
}

function onClickGooglePlay() {
  emit('clickGooglePlay')
}
</script>
