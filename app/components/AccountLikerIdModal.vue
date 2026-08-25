<template>
  <UModal
    :title="$t('account_page_liker_id_edit_title')"
    :description="$t('account_page_liker_id_edit_description')"
    :dismissible="!isUpdatingLikerId"
    :close="!isUpdatingLikerId"
    :ui="{
      title: 'text-lg font-bold',
      body: 'space-y-4',
      footer: 'flex justify-end gap-3',
    }"
    @update:open="open => !open && emit('close')"
  >
    <template #body>
      <UAlert
        icon="i-material-symbols-warning-outline-rounded"
        color="warning"
        variant="subtle"
        :title="$t('account_page_liker_id_edit_warning')"
      />

      <UFormField
        :error="hint.error"
        :help="hint.help"
        :ui="{ help: hint.helpClass }"
      >
        <UInput
          v-model="likerIdInput"
          class="w-full font-mono"
          autofocus
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          :maxlength="LIKER_ID_MAX_LENGTH"
          :placeholder="$t('account_page_liker_id_edit_placeholder')"
          :disabled="isUpdatingLikerId"
          :loading="availabilityStatus === 'checking'"
          @keydown.enter="confirmLikerIdEdit"
        >
          <template #leading>
            <span
              class="text-muted text-sm"
              v-text="'@'"
            />
          </template>
        </UInput>
      </UFormField>
    </template>

    <template #footer>
      <UButton
        :label="$t('common_cancel')"
        variant="outline"
        color="neutral"
        :disabled="isUpdatingLikerId"
        @click="emit('close')"
      />
      <UButton
        :label="$t('account_page_liker_id_edit_save')"
        color="primary"
        :loading="isUpdatingLikerId"
        :disabled="!isSubmittable"
        @click="confirmLikerIdEdit"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  close: []
}>()

const { t: $t } = useI18n()
const accountStore = useAccountStore()
const userAccountSessionAPI = useUserAccountSessionAPI()
const { publicLikerId } = usePublicLikerId()
const { handleError } = useErrorHandler()
const toast = useToast()

const AVAILABILITY_DEBOUNCE_MS = 300

type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken' | 'failed'
type HintStatus = 'empty' | 'invalid' | 'unchanged' | Exclude<AvailabilityStatus, 'idle'>

const likerIdInput = ref('')
const isUpdatingLikerId = ref(false)

// The probe verdict, paired with the value it was run for. Reading them together
// is what keeps a verdict from outliving its input during the debounce window.
const probedLikerId = ref('')
const probeStatus = ref<AvailabilityStatus>('idle')
// Availability answers are stable enough to reuse within one modal session, so a
// backspace back to an already-probed handle costs nothing. Bounded by the input.
const availabilityCache = new Map<string, boolean>()
let probeController: AbortController | undefined

const normalizedLikerId = computed(() => getCanonicalLikerId(likerIdInput.value))
const isFormatValid = computed(() => checkLikerIdValid(normalizedLikerId.value))
const isUnchanged = computed(() => normalizedLikerId.value === publicLikerId.value.toLowerCase())
const availabilityStatus = computed<AvailabilityStatus>(() =>
  probedLikerId.value === normalizedLikerId.value ? probeStatus.value : 'idle')

// A failed probe must not block the rename: the POST is the real gate and answers
// with HANDLE_ALREADY_TAKEN if the pre-check was too optimistic.
const isSubmittable = computed(() =>
  isFormatValid.value
  && !isUnchanged.value
  && !isUpdatingLikerId.value
  && ['available', 'failed'].includes(availabilityStatus.value),
)

const hintStatus = computed<HintStatus>(() => {
  if (!isFormatValid.value) return normalizedLikerId.value ? 'invalid' : 'empty'
  if (isUnchanged.value) return 'unchanged'
  // 'idle' covers both an untouched field and the debounce window before a probe.
  if (availabilityStatus.value === 'idle') return 'empty'
  return availabilityStatus.value
})

const HINT_VARIANTS: Record<HintStatus, { key: string, isError?: boolean, helpClass?: string }> = {
  empty: { key: 'format' },
  invalid: { key: 'format', isError: true },
  unchanged: { key: 'unchanged' },
  checking: { key: 'checking' },
  available: { key: 'available', helpClass: 'text-success' },
  taken: { key: 'taken', isError: true },
  failed: { key: 'check_failed' },
}

const hint = computed(() => {
  const { key, isError, helpClass } = HINT_VARIANTS[hintStatus.value]
  const message = $t(`account_page_liker_id_edit_hint_${key}`, {
    min: LIKER_ID_MIN_LENGTH,
    max: LIKER_ID_MAX_LENGTH,
  })
  // Undefined, not '': UFormField types `error` as [Boolean, String], so Vue's
  // boolean casting turns an empty string into `true` and marks the field invalid.
  return {
    error: isError ? message : undefined,
    help: isError ? undefined : message,
    helpClass: helpClass || 'text-muted',
  }
})

async function probeAvailability(likerId: string) {
  const cached = availabilityCache.get(likerId)
  if (cached !== undefined) {
    probedLikerId.value = likerId
    probeStatus.value = cached ? 'available' : 'taken'
    return
  }

  const controller = new AbortController()
  probeController = controller
  probedLikerId.value = likerId
  probeStatus.value = 'checking'
  // The session client carries no timeout (it also serves payment mutations, which
  // must never be aborted mid-flight), so bound this probe here: a wedged connection
  // would otherwise strand 'checking' and leave Save permanently disabled.
  let isTimedOut = false
  const timeoutId = setTimeout(() => {
    isTimedOut = true
    controller.abort()
  }, API_FETCH_TIMEOUT_MS)

  try {
    const { isAvailable } = await userAccountSessionAPI.checkLikerIdAvailability(likerId, {
      signal: controller.signal,
    })
    availabilityCache.set(likerId, isAvailable)
    probeStatus.value = isAvailable ? 'available' : 'taken'
  }
  catch (error) {
    // Superseded by a newer probe (or the modal closed) — that run owns the status.
    if (controller.signal.aborted && !isTimedOut) return
    console.warn('Failed to check Liker ID availability:', error)
    probeStatus.value = 'failed'
  }
  finally {
    clearTimeout(timeoutId)
  }
}

watchDebounced(normalizedLikerId, (likerId) => {
  probeController?.abort()
  if (!isFormatValid.value || isUnchanged.value) return
  probeAvailability(likerId)
}, { debounce: AVAILABILITY_DEBOUNCE_MS })

onScopeDispose(() => probeController?.abort())

async function confirmLikerIdEdit() {
  if (!isSubmittable.value) return
  const nextLikerId = normalizedLikerId.value
  isUpdatingLikerId.value = true
  try {
    try {
      await userAccountSessionAPI.updateUserLikerId(nextLikerId)
    }
    catch (error) {
      await handleError(error, {
        title: $t('account_page_liker_id_update_failed'),
        customHandlerMap: {
          HANDLE_ALREADY_TAKEN: $t('account_page_liker_id_update_failed_taken'),
          // Session predates a rename made elsewhere, so the edit button is
          // still showing. Resync it away instead of inviting a second attempt.
          HANDLE_ALREADY_CHANGED: {
            description: $t('account_page_liker_id_update_failed_already_changed'),
            onClose: () => { accountStore.refreshSessionInfo().catch(() => {}) },
          },
          HANDLE_UNCHANGED: $t('account_page_liker_id_edit_hint_unchanged'),
          INVALID_USER_ID: $t('account_page_liker_id_edit_hint_format', {
            min: LIKER_ID_MIN_LENGTH,
            max: LIKER_ID_MAX_LENGTH,
          }),
        },
      })
      return
    }
    useLogEvent('account_liker_id_update_success')
    toast.add({
      title: $t('account_page_liker_id_update_success'),
      color: 'success',
    })
    emit('close')
    try {
      await accountStore.refreshSessionInfo()
    }
    catch (error) {
      console.error('Failed to refresh session info after Liker ID update:', error)
    }
  }
  finally {
    isUpdatingLikerId.value = false
  }
}
</script>
