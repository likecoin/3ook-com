<template>
  <main class="w-full max-w-xl mx-auto p-4 space-y-4 phone:grow">
    <div class="flex items-center gap-4">
      <UButton
        class="rounded-full"
        icon="i-material-symbols-arrow-back-rounded"
        :to="$localeRoute({ name: 'account' })"
        variant="subtle"
        color="neutral"
      />

      <h1
        class="text-xl font-bold"
        v-text="t('breadcrumb_account_deposit')"
      />
    </div>

    <!-- Login Prompt -->
    <UCard
      v-if="!hasLoggedIn"
      :ui="{ header: 'flex justify-center items-center p-4 sm:p-4 bg-theme-black' }"
    >
      <template #header>
        <AppLogo
          :is-icon="false"
          :height="64"
        />
      </template>

      <UButton
        :label="t('account_page_login')"
        :loading="accountStore.isLoggingIn"
        icon="i-material-symbols-login"
        color="primary"
        variant="outline"
        size="xl"
        block
        @click="handleLogin"
      />
    </UCard>

    <!-- Governance Content -->
    <template v-if="hasLoggedIn && walletAddress">
      <!-- My Staking Overview Section -->
      <section class="space-y-3">
        <h2
          class="text-lg font-bold"
          v-text="t('governance_page_overview')"
        />

        <div class="grid grid-cols-2 gap-4">
          <!-- Total Staked Balance Card -->
          <UCard :ui="{ body: 'flex flex-col items-start p-4' }">
            <div class="flex items-center gap-2 mb-3">
              <UIcon
                name="i-material-symbols-trending-up-rounded"
                class="size-5 text-primary"
              />
              <span
                class="text-xs font-semibold text-muted"
                v-text="t('governance_page_staked_balance')"
              />
            </div>
            <BalanceLabel
              class="text-xl"
              :value="governanceData.formattedLikeStakedBalance.value"
            />
            <div
              class="text-xs text-muted mt-2"
              v-text="t('governance_page_staked_subtitle')"
            />
          </UCard>

          <!-- My Voting Power Card -->
          <UCard :ui="{ body: 'flex flex-col items-start p-4' }">
            <div class="flex items-center gap-2 mb-3">
              <UIcon
                name="i-material-symbols-verified-outline-rounded"
                class="size-5 text-primary"
              />
              <span
                class="text-xs font-semibold text-muted"
                v-text="t('governance_page_voting_power')"
              />
            </div>
            <BalanceLabel
              class="text-xl"
              :value="governanceData.totalVotingPower.value"
              currency="veLIKE"
            />
            <div
              class="text-xs text-muted mt-2"
              v-text="t('governance_page_voting_subtitle')"
            />
          </UCard>
        </div>
      </section>

      <!-- Earned Rewards Section -->
      <section class="space-y-3">
        <h2
          class="text-lg font-bold"
          v-text="t('governance_page_rewards')"
        />

        <UCard :ui="{ body: '!p-0 divide-y-1 divide-(--ui-border)' }">
          <!-- Accumulated Rewards -->
          <div class="px-4 py-4 flex items-start justify-between">
            <div class="flex items-start gap-3">
              <UIcon
                name="i-material-symbols-auto-graph-rounded"
                class="size-5 text-primary mt-1 shrink-0"
              />
              <div class="flex flex-col">
                <span
                  class="text-sm font-semibold"
                  v-text="t('governance_page_accumulated_rewards')"
                />
                <BalanceLabel
                  class="text-2xl mt-1"
                  :value="governanceData.formattedPendingReward.value"
                />
              </div>
            </div>
          </div>

          <!-- Estimated Rewards Per Day -->
          <div class="px-4 py-4 flex items-start justify-between">
            <div class="flex items-start gap-3">
              <UIcon
                name="i-material-symbols-trending-up-rounded"
                class="size-5 text-primary mt-1 shrink-0"
              />
              <div class="flex flex-col">
                <span
                  class="text-sm font-semibold"
                  v-text="t('governance_page_estimated_rewards')"
                />
                <BalanceLabel
                  class="text-2xl mt-1"
                  :value="governanceData.estimatedRewardPerDay.value"
                />
              </div>
            </div>
          </div>

          <!-- Claim Rewards Button -->
          <div class="px-4 py-4">
            <UButton
              :label="isClaimRewardButtonEnabled ? t('governance_page_claim_rewards') : t('governance_page_claim_rewards_disabled')"
              color="primary"
              size="lg"
              block
              :loading="isLoading"
              :disabled="!isClaimRewardButtonEnabled"
              @click="handleClaimRewards"
            />
          </div>

          <!-- Auto Restake Checkbox -->
          <div class="px-4 py-4 flex items-center justify-between">
            <span
              class="text-sm font-semibold"
              v-text="t('governance_page_auto_restake')"
            />
            <USwitch v-model="isAutoRestakeEnabled" />
          </div>
        </UCard>
      </section>

      <!-- Stake/Withdraw Section -->
      <section class="space-y-3 pb-4">
        <h2
          class="text-lg font-bold"
          v-text="t('governance_page_manage_stake')"
        />

        <UCard :ui="{ body: '!p-0 divide-y-1 divide-(--ui-border)' }">
          <!-- Stake LIKE -->
          <div class="px-4 py-4 space-y-3">
            <h3
              class="flex items-center gap-2"
            >
              <UIcon
                name="i-material-symbols-arrow-upward-rounded"
                class="size-4"
              />
              <span
                class="text-sm font-semibold"
                v-text="t('governance_page_stake_like')"
              />
            </h3>
            <div class="flex items-center gap-2">
              <UInput
                v-model="stakeAmount"
                type="number"
                :placeholder="t('governance_page_amount_placeholder')"
                step="0.01"
                :disabled="isLoading"
                class="flex-1"
              >
                <template #trailing>
                  <span class="text-sm">LIKE</span>
                </template>
              </UInput>
              <UButton
                :label="$t('amount_input_max')"
                size="sm"
                color="neutral"
                variant="outline"
                @click="handleMaxStake"
              />
              <UButton
                :label="$t('amount_input_half')"
                size="sm"
                color="neutral"
                variant="outline"
                @click="handleHalfStake"
              />
            </div>
            <UButton
              :label="t('governance_page_stake_button')"
              color="success"
              size="lg"
              block
              :loading="isLoading"
              :disabled="!stakeAmount || isLoading"
              @click="handleStake"
            />
          </div>

          <!-- Withdraw LIKE -->
          <div class="px-4 py-4 space-y-3">
            <h3
              class="flex items-center gap-2"
            >
              <UIcon
                name="i-material-symbols-arrow-downward-rounded"
                class="size-4"
              />
              <span
                class="text-sm font-semibold"
                v-text="t('governance_page_withdraw_like')"
              />
            </h3>

            <!-- Lock Time Warning -->
            <UAlert
              v-if="governanceData.isWithdrawLocked.value"
              :title="t('governance_page_withdraw_locked')"
              :description="formatLockTimeRemaining(governanceData.timeUntilWithdrawUnlock.value)"
              icon="i-material-symbols-lock-clock-outline-rounded"
              color="warning"
              variant="subtle"
            />

            <div class="flex items-center gap-2">
              <UInput
                v-model="withdrawAmount"
                type="number"
                :placeholder="t('governance_page_withdraw_placeholder')"
                step="0.01"
                :disabled="isLoading || governanceData.isWithdrawLocked.value"
                class="flex-1"
              >
                <template #trailing>
                  <span class="text-sm">LIKE</span>
                </template>
              </UInput>
              <UButton
                :label="$t('amount_input_max')"
                size="sm"
                color="neutral"
                variant="outline"
                :disabled="governanceData.isWithdrawLocked.value"
                @click="handleMaxWithdraw"
              />
              <UButton
                :label="$t('amount_input_half')"
                size="sm"
                color="neutral"
                variant="outline"
                :disabled="governanceData.isWithdrawLocked.value"
                @click="handleHalfWithdraw"
              />
            </div>
            <UButton
              :label="t('governance_page_withdraw_button')"
              color="error"
              size="lg"
              block
              :loading="isLoading"
              :disabled="!withdrawAmount || isLoading || governanceData.isWithdrawLocked.value"
              @click="handleWithdraw"
            />
          </div>
        </UCard>
      </section>
    </template>

    <!-- Empty State -->
    <div
      v-if="hasLoggedIn && !walletAddress"
      class="text-center text-muted py-8"
      v-text="t('governance_page_no_wallet')"
    />
  </main>
</template>

<script setup lang="ts">
import { formatUnits, parseUnits } from 'viem'

const { likeCoinTokenDecimals } = useRuntimeConfig().public
const accountStore = useAccountStore()
const { t } = useI18n()
const toast = useToast()
const { loggedIn: hasLoggedIn, user } = useUserSession()

const walletAddress = computed(() => user.value?.evmWallet || '')
const { restoreConnection } = accountStore

const governanceData = useGovernanceData(walletAddress)
const { claimReward, restakeReward, withdraw } = useVeLikeContract()
const { balanceOf } = useLikeCoinContract()

const stakeAmount = ref(0)
const withdrawAmount = ref(0)
const isAutoRestakeEnabled = ref(true)
const isLoading = ref(false)
const error = ref<string | null>(null)

const isClaimRewardButtonEnabled = computed(() => governanceData.pendingReward.value > 0n)

async function handleLogin() {
  await accountStore.login()
}

async function handleClaimRewards() {
  try {
    isLoading.value = true
    error.value = null
    await restoreConnection()
    if (isAutoRestakeEnabled.value) {
      await restakeReward(walletAddress.value)
      toast.add({
        title: t('governance_page_success'),
        description: t('governance_page_rewards_restaked'),
        color: 'success',
      })
    }
    else {
      await claimReward(walletAddress.value)
      toast.add({
        title: t('governance_page_success'),
        description: t('governance_page_rewards_claimed'),
        color: 'success',
      })
    }
    await sleep(3000)
    await governanceData.loadGovernanceData()
  }
  catch (err) {
    console.error('Error claiming/restaking rewards:', err)
    error.value = err instanceof Error ? err.message : t('governance_page_error_claiming')
    toast.add({
      title: t('governance_page_error'),
      description: error.value,
      color: 'error',
    })
  }
  finally {
    isLoading.value = false
  }
}

async function handleStake() {
  if (!stakeAmount.value || !walletAddress.value) {
    return
  }

  try {
    isLoading.value = true
    error.value = null
    await restoreConnection()
    const amount = parseUnits(stakeAmount.value.toString(), likeCoinTokenDecimals)

    await governanceData.approveAndDeposit(amount, walletAddress.value)

    toast.add({
      title: t('governance_page_success'),
      description: t('governance_page_staked'),
      color: 'success',
    })
    stakeAmount.value = 0
    await sleep(3000)
    await governanceData.loadGovernanceData()
  }
  catch (err) {
    console.error('Error staking:', err)
    error.value = err instanceof Error ? err.message : t('governance_page_stake_error')
    toast.add({
      title: t('governance_page_error'),
      description: error.value,
      color: 'error',
    })
  }
  finally {
    isLoading.value = false
  }
}

async function handleWithdraw() {
  if (!withdrawAmount.value || !walletAddress.value) {
    return
  }

  try {
    isLoading.value = true
    error.value = null
    await restoreConnection()
    const amount = parseUnits(withdrawAmount.value.toString(), likeCoinTokenDecimals)

    await withdraw(amount, walletAddress.value, walletAddress.value)

    toast.add({
      title: t('governance_page_success'),
      description: t('governance_page_withdrawn'),
      color: 'success',
    })
    withdrawAmount.value = 0
    await sleep(3000)
    await governanceData.loadGovernanceData()
  }
  catch (err) {
    console.error('Error withdrawing:', err)
    error.value = err instanceof Error ? err.message : t('governance_page_withdraw_error')
    toast.add({
      title: t('governance_page_error'),
      description: error.value,
      color: 'error',
    })
  }
  finally {
    isLoading.value = false
  }
}

async function handleMaxStake() {
  if (!walletAddress.value) return
  try {
    const balance = await balanceOf(walletAddress.value)
    stakeAmount.value = Number(formatUnits(balance, likeCoinTokenDecimals))
  }
  catch (err) {
    console.error('Error fetching LIKE balance:', err)
  }
}

async function handleHalfStake() {
  if (!walletAddress.value) return
  try {
    const balance = await balanceOf(walletAddress.value)
    stakeAmount.value = Number(formatUnits(balance / 2n, likeCoinTokenDecimals))
  }
  catch (err) {
    console.error('Error fetching LIKE balance:', err)
  }
}

function handleMaxWithdraw() {
  if (governanceData.veLikeBalance.value === 0n) return
  withdrawAmount.value = Number(formatUnits(governanceData.veLikeBalance.value, likeCoinTokenDecimals))
}

function handleHalfWithdraw() {
  if (governanceData.veLikeBalance.value === 0n) return
  withdrawAmount.value = Number(formatUnits(governanceData.veLikeBalance.value / 2n, likeCoinTokenDecimals))
}

function formatLockTimeRemaining(secondsRemaining: number): string {
  if (secondsRemaining <= 0) {
    return ''
  }

  const days = Math.floor(secondsRemaining / 86400)
  const hours = Math.floor((secondsRemaining % 86400) / 3600)
  const minutes = Math.floor((secondsRemaining % 3600) / 60)

  if (days > 0) {
    return t('governance_page_unlock_time_days', { days, hours })
  }
  else if (hours > 0) {
    return t('governance_page_unlock_time_hours', { hours, minutes })
  }
  else {
    return t('governance_page_unlock_time_minutes', { minutes })
  }
}
</script>
