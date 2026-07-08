<template>
  <section
    v-if="hasLoggedIn"
    class="flex flex-col items-center gap-3"
  >
    <div class="relative">
      <UAvatar
        class="bg-white border border-muted size-24"
        :src="user?.avatar"
        :alt="user?.displayName || ''"
        icon="i-material-symbols-person-2-rounded"
        size="3xl"
      />
      <UserAvatarPlusBadge
        v-if="user?.isLikerPlus"
        class="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/4"
        color="primary"
      />
      <div class="absolute -bottom-1 -right-1 rounded-full bg-(--app-bg)">
        <UButton
          class="rounded-[inherit]"
          icon="i-material-symbols-edit-outline-rounded"
          variant="outline"
          color="neutral"
          :loading="isUploadingAvatar"
          :aria-label="$t('account_page_avatar_change_avatar')"
          @click="handleAvatarEditButtonClick"
        />
      </div>
      <input
        ref="avatarFileInput"
        class="hidden"
        type="file"
        accept="image/*"
        @change="handleAvatarFileChange"
      >
    </div>
  </section>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const accountStore = useAccountStore()
const userAccountSessionAPI = useUserAccountSessionAPI()
const { handleError } = useErrorHandler()
const toast = useToast()

const AVATAR_MAX_BYTES = 2 * 1024 * 1024

const avatarFileInput = useTemplateRef<HTMLInputElement>('avatarFileInput')
const isUploadingAvatar = ref(false)

function handleAvatarEditButtonClick() {
  if (isUploadingAvatar.value) return
  useLogEvent('account_avatar_edit_click')
  avatarFileInput.value?.click()
}

async function handleAvatarFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    toast.add({
      title: $t('account_page_avatar_invalid_file'),
      color: 'error',
    })
    return
  }
  if (file.size > AVATAR_MAX_BYTES) {
    toast.add({
      title: $t('account_page_avatar_too_large'),
      color: 'error',
    })
    return
  }
  isUploadingAvatar.value = true
  try {
    try {
      const resizedFile = await resizeImageFile(file, 256)
      await userAccountSessionAPI.uploadUserAvatar(resizedFile)
    }
    catch (error) {
      await handleError(error, {
        title: $t('account_page_avatar_update_failed'),
      })
      return
    }
    useLogEvent('account_avatar_update_success')
    toast.add({
      title: $t('account_page_avatar_update_success'),
      color: 'success',
    })
    try {
      await accountStore.refreshSessionInfo()
    }
    catch (error) {
      console.error('Failed to refresh session info after avatar update:', error)
    }
  }
  finally {
    isUploadingAvatar.value = false
  }
}
</script>
