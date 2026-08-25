<template>
  <div class="flex flex-col items-center">
    <UButton
      v-if="!isExpanded"
      class="cursor-pointer"
      :label="$t('pricing_page_referrer_input_toggle')"
      icon="i-material-symbols-loyalty-rounded"
      color="neutral"
      variant="link"
      size="sm"
      @click="handleExpand"
    />

    <form
      v-else
      class="w-full"
      @submit.prevent="handleSubmit"
    >
      <UFormField
        :error="errorMessage"
        :help="$t('pricing_page_referrer_input_help')"
        :label="$t('pricing_page_referrer_input_label')"
      >
        <UFieldGroup class="w-full">
          <UInput
            v-model="referrerId"
            class="flex-1"
            :placeholder="$t('pricing_page_referrer_input_placeholder')"
            :disabled="isVerifying"
            autocapitalize="none"
            autocorrect="off"
            spellcheck="false"
            autofocus
          />
          <UButton
            :label="$t('pricing_page_referrer_input_confirm')"
            :loading="isVerifying"
            color="neutral"
            :disabled="!referrerId.trim()"
            :ui="{ base: 'cursor-pointer' }"
            type="submit"
          />
        </UFieldGroup>
      </UFormField>
    </form>
  </div>
</template>

<script setup lang="ts">
import { FetchError } from 'ofetch'
import { getCanonicalLikerId } from '~~/shared/utils/liker-id'
import type { LikerInfo } from '~/composables/use-liker-info'

const emit = defineEmits<{
  applied: [likerId: string]
}>()

const { t: $t } = useI18n()
const queryCache = useQueryCache()
const { user } = useUserSession()
const { publicLikerId } = usePublicLikerId()

const isExpanded = ref(false)
const referrerId = ref('')
const isVerifying = ref(false)
// Undefined, not '': UFormField types `error` as [Boolean, String], so Vue's
// boolean casting turns an empty string into `true` and marks the field invalid.
const errorMessage = ref<string | undefined>(undefined)

watch(referrerId, () => {
  errorMessage.value = undefined
})

function handleExpand() {
  isExpanded.value = true
  useLogEvent('referrer_code_expand')
}

function rejectAsNotFound() {
  errorMessage.value = $t('pricing_page_referrer_input_error_not_found')
  useLogEvent('referrer_code_invalid', { reason: 'not_found' })
}

async function handleSubmit() {
  // Liker IDs are lowercase alphanumeric; accept a pasted `@handle` or a
  // hand-typed uppercase code and normalize both to the canonical form.
  const likerId = getCanonicalLikerId(referrerId.value)
  if (!likerId) return

  errorMessage.value = undefined

  // Both forms resolve to this account, so either one entered is self-referral.
  if ([publicLikerId.value, user.value?.likerId].some(id => id?.toLowerCase() === likerId)) {
    errorMessage.value = $t('pricing_page_referrer_input_error_self')
    useLogEvent('referrer_code_invalid', { reason: 'self' })
    return
  }

  // Resolving the public Liker profile is the validation — there is no separate
  // code registry, and hardcoding a length would reject legacy 7-20 char IDs.
  let referrerInfo: LikerInfo | undefined
  try {
    isVerifying.value = true
    referrerInfo = await fetchLikerInfoByIdThroughCache(queryCache, likerId)
  }
  catch (error) {
    // Only a 404 proves the code is wrong. A network or 5xx failure must not tell
    // the user a valid partner code does not exist.
    if (error instanceof FetchError && error.statusCode === 404) {
      rejectAsNotFound()
    }
    else {
      errorMessage.value = $t('pricing_page_referrer_input_error_unavailable')
      useLogEvent('referrer_code_invalid', { reason: 'error' })
    }
    return
  }
  finally {
    isVerifying.value = false
  }

  // Check `likerId`, not the result itself: normalization always yields an
  // object, so a resolved-but-empty response would otherwise look valid.
  if (!referrerInfo?.likerId) {
    rejectAsNotFound()
    return
  }

  useLogEvent('referrer_code_applied', { referrer_liker_id: likerId })
  emit('applied', likerId)
}
</script>
