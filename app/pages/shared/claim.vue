<template>
  <!-- Claim State -->
  <main v-if="!error && !isClaimed">
    <!-- Header -->
    <div class="w-full bg-theme-black">
      <div class="px-4 py-2">
        <UButton
          class="group"
          :label="$t('gift_plus_claim_back_button')"
          variant="link"
          color="neutral"
          :loading="isRedirecting"
          :ui="{ base: '!px-0 text-white hover:text-theme-cyan' }"
          @click="handleMaybeLater"
        >
          <template #leading>
            <div class="rounded-full p-1 border-1 text-white group-hover:text-theme-cyan border-gray-300 flex">
              <UIcon
                name="i-material-symbols-arrow-back-rounded"
                class="w-4 h-4"
              />
            </div>
          </template>
        </UButton>
      </div>

      <div class="flex flex-col items-center justify-center px-4 py-8 laptop:pb-16">
        <!-- Invite Icon -->
        <UIcon
          v-gsap.from="{
            opacity: 0,
            scale: 5,
            y: '-400%',
            duration: 0.5,
            ease: 'power3.out',
          }"
          class="text-theme-cyan"
          name="i-material-symbols-group-add-rounded"
          :size="64"
        />

        <!-- Invite Message -->
        <h1
          class="mt-5 text-theme-cyan text-3xl font-bold text-center"
          v-text="$t('civic_member_claim_title')"
        />

        <p
          class="mt-3 text-white text-lg text-center"
          v-text="$t('civic_member_claim_description')"
        />

        <p
          v-if="giverLikerId"
          class="mt-2 text-white/70 text-sm text-center"
          v-text="$t('civic_member_claim_from', { name: giverLikerId })"
        />

        <!-- Info Section -->
        <PricingPlanBenefits
          v-if="!isExistingPlusMember"
          class="mt-6"
          :title="$t('gift_plus_claim_info_title')"
          :is-title-center="true"
          :is-dark-background="true"
        />
      </div>
    </div>

    <div class="flex flex-col items-center px-4 py-8">
      <!-- Already Plus Member State -->
      <template v-if="isExistingPlusMember">
        <UIcon
          class="mt-8 text-theme-black"
          name="i-material-symbols-check-circle-rounded"
          :size="64"
        />
        <h1
          class="mt-5 text-2xl font-bold"
          v-text="$t('civic_member_claim_already_member_title')"
        />
        <p
          class="mt-3 text-muted text-center"
          v-text="$t('civic_member_claim_already_member_description')"
        />

        <UButton
          class="mt-8"
          :label="$t('gift_plus_claim_continue_button')"
          color="primary"
          variant="outline"
          size="xl"
          :ui="{ base: 'cursor-pointer' }"
          @click="handleContinue"
        />
      </template>

      <!-- Action Buttons -->
      <div
        v-else
        class="flex flex-col items-center gap-3 w-full max-w-sm"
      >
        <p
          v-if="!hasLoggedIn"
          class="text-sm text-muted text-center"
          v-text="$t('civic_member_claim_login_hint')"
        />
        <UButton
          :label="$t('civic_member_claim_button')"
          color="primary"
          size="xl"
          :loading="isClaiming"
          block
          :ui="{ base: 'cursor-pointer' }"
          @click="handleClaim"
        />
        <UButton
          :label="$t('gift_plus_claim_maybe_later')"
          color="neutral"
          variant="outline"
          size="xl"
          :loading="isRedirecting"
          block
          :ui="{ base: 'cursor-pointer' }"
          @click="handleMaybeLater"
        />
      </div>
    </div>
  </main>

  <main
    v-else
    class="flex flex-col items-center justify-center grow px-4 py-8"
  >
    <!-- Success State -->
    <template v-if="isClaimed">
      <UIcon
        class="text-theme-black"
        name="i-material-symbols-check-circle-rounded"
        :size="64"
      />
      <h1
        class="mt-5 text-2xl font-bold"
        v-text="$t('civic_member_claim_success_title')"
      />
      <p
        class="mt-3 text-muted text-center"
        v-text="$t('civic_member_claim_success_description')"
      />

      <div class="flex flex-col gap-3 w-full max-w-sm mt-8">
        <UButton
          :label="$t('civic_member_claim_success_library_button')"
          color="primary"
          size="xl"
          block
          :ui="{ base: 'cursor-pointer' }"
          @click="handleGoToLibrary"
        />
        <UButton
          :label="$t('gift_plus_claim_continue_button')"
          color="neutral"
          variant="outline"
          size="xl"
          block
          :ui="{ base: 'cursor-pointer' }"
          @click="handleContinue"
        />
      </div>
    </template>

    <!-- Error State -->
    <template v-else>
      <UIcon
        name="i-material-symbols-error-circle-rounded"
        class="text-error"
        :size="64"
      />
      <h1
        class="mt-5 text-2xl font-bold"
        v-text="$t('civic_member_claim_error_title')"
      />
      <p
        class="mt-3 text-muted text-center"
        v-text="error"
      />

      <UButton
        class="mt-8"
        :label="$t('gift_plus_claim_back_button')"
        color="primary"
        variant="outline"
        size="xl"
        :loading="isRedirecting"
        :ui="{ base: 'cursor-pointer' }"
        @click="handleMaybeLater"
      />
    </template>
  </main>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const { handleError } = useErrorHandler()
const plusGiftSessionAPI = usePlusGiftSessionAPI()
const accountStore = useAccountStore()
const { loggedIn: hasLoggedIn, user } = useUserSession()

const getRouteQuery = useRouteQuery()

useHead({
  title: $t('civic_member_claim_title'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

const isClaiming = ref(false)
const isClaimed = ref(false)
const isRedirecting = ref(false)
const error = ref<string | null>(null)

const isExistingPlusMember = computed(() => hasLoggedIn.value && user.value?.isLikerPlus)

// Extract query parameters. The invite email links to
// /shared/claim?giver=...&invite=...&token=...
const inviteId = computed(() => getRouteQuery('invite') || '')
const claimToken = computed(() => getRouteQuery('token') || '')
const giverLikerId = computed(() => getRouteQuery('giver') || '')

// All three are required by the claim API, so a link missing any of them can
// never be claimed; fail fast rather than let it 400 into a generic error.
onMounted(() => {
  if (!inviteId.value || !claimToken.value || !giverLikerId.value) {
    error.value = $t('civic_member_claim_error_invalid')
  }
})

async function handleClaim() {
  // Ensure user is logged in
  if (!hasLoggedIn.value) {
    await accountStore.login()
    if (!hasLoggedIn.value) return
  }

  // Already a Plus member: nothing to claim. The already-member UI shows via
  // isExistingPlusMember, so stop before the redundant claim call.
  if (user.value?.isLikerPlus) return

  if (isClaiming.value) return

  try {
    isClaiming.value = true

    await plusGiftSessionAPI.claimSharedMemberInvite({
      giverLikerId: giverLikerId.value,
      inviteId: inviteId.value,
      token: claimToken.value,
    })

    useLogEvent('civic_member_claimed', { invite_id: inviteId.value })

    // The claim activates Plus synchronously; refresh to pick it up.
    await accountStore.refreshSessionInfo()

    isClaimed.value = true
  }
  catch (err) {
    const { message, statusCode } = parseError(err)
    if (statusCode === 409 && message === 'ALREADY_SUBSCRIBED') {
      // Not an error: the account already has Plus. Refresh so the
      // already-member UI (isExistingPlusMember) takes over.
      error.value = null
      await accountStore.refreshSessionInfo().catch(() => {})
    }
    else if (message === 'INVITE_NOT_CLAIMABLE') {
      error.value = $t('civic_member_claim_error_not_claimable')
    }
    // The giver no longer qualifies. Mixed prefixes are intentional: CIVIC_*
    // asserts something about the giver's own subscription, SHARED_MEMBER_*
    // about the seats layered on top of it.
    else if ([
      'CIVIC_TIER_REQUIRED',
      'CIVIC_SUBSCRIPTION_NOT_ACTIVE',
      'SHARED_MEMBER_NOT_AVAILABLE_ON_TRIAL',
    ].includes(message)) {
      error.value = $t('civic_member_claim_error_giver_lapsed')
    }
    else if (statusCode === 403 || statusCode === 404) {
      error.value = $t('civic_member_claim_error_invalid')
    }
    else {
      await handleError(err, {
        title: $t('civic_member_claim_error_title'),
      })
    }
  }
  finally {
    isClaiming.value = false
  }
}

async function navigateToPage(routeName: string) {
  isRedirecting.value = true
  try {
    await navigateTo(localeRoute({ name: routeName }))
  }
  catch (err) {
    await handleError(err)
    isRedirecting.value = false
  }
}

async function handleMaybeLater() {
  await navigateToPage('store')
}

async function handleContinue() {
  await navigateToPage('account')
}

async function handleGoToLibrary() {
  await navigateToPage('shelf')
}
</script>
