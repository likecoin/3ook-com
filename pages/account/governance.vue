<template>
  <NuxtLayout
    name="default"
    :is-footer-visible="true"
  >
    <main class="w-full max-w-xl mx-auto p-4 space-y-4 phone:grow">
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
        <!-- Page Title -->
        <div class="pt-4">
          <h1
            class="text-2xl font-bold"
            v-text="t('governance_page_title')"
          />
          <p
            class="text-sm text-muted mt-1"
            v-text="t('governance_page_subtitle')"
          />
        </div>

        <!-- My Staking Overview Section -->
        <section class="space-y-3">
          <h2
            class="px-4 text-lg font-bold"
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
              <div
                class="text-xl font-bold"
                v-text="`${governanceData.formattedLikeStakedBalance.value} LIKE`"
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
              <div
                class="text-xl font-bold"
                v-text="`${governanceData.totalVotingPower.value} veLIKE`"
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
            class="px-4 text-lg font-bold"
            v-text="t('governance_page_rewards')"
          />

          <UCard :ui="{ body: '!p-0 divide-y-1 divide-(--ui-border)' }">
            <!-- Accumulated Rewards -->
            <div class="px-4 py-4 flex items-start justify-between">
              <div class="flex items-start gap-3">
                <UIcon
                  name="i-material-symbols-card-giftcard-outline-rounded"
                  class="size-5 text-primary mt-1 shrink-0"
                />
                <div class="flex flex-col">
                  <span
                    class="text-sm font-semibold"
                    v-text="t('governance_page_accumulated_rewards')"
                  />
                  <span
                    class="text-2xl font-bold mt-1"
                    v-text="`${governanceData.formattedPendingReward.value} LIKE`"
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
                  <span
                    class="text-2xl font-bold mt-1"
                    v-text="`${governanceData.estimatedRewardPerDay.value} LIKE`"
                  />
                </div>
              </div>
            </div>

            <!-- Claim Rewards Button -->
            <div class="px-4 py-4">
              <UButton
                :label="t('governance_page_claim_rewards')"
                icon="i-material-symbols-card-giftcard-outline-rounded"
                color="primary"
                size="lg"
                block
                :loading="isLoading"
                :disabled="governanceData.pendingReward.value === 0n"
                @click="handleClaimRewards"
              />
            </div>

            <!-- Auto Restake Checkbox -->
            <div class="px-4 py-4 flex items-center justify-between">
              <span
                class="text-sm font-semibold"
                v-text="t('governance_page_auto_restake')"
              />
              <UCheckbox
                v-model="autoRestakeEnabled"
              />
            </div>
          </UCard>
        </section>

        <!-- Stake/Withdraw Section -->
        <section class="space-y-3 pb-4">
          <h2
            class="px-4 text-lg font-bold"
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
                />
                <UButton
                  label="Max"
                  size="sm"
                  color="neutral"
                  variant="outline"
                  @click="handleMaxStake"
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
              <div class="flex items-center gap-2">
                <UInput
                  v-model="withdrawAmount"
                  type="number"
                  :placeholder="t('governance_page_withdraw_placeholder')"
                  step="0.01"
                  :disabled="isLoading"
                  class="flex-1"
                />
                <UButton
                  label="Max"
                  size="sm"
                  color="neutral"
                  variant="outline"
                  @click="handleMaxWithdraw"
                />
              </div>
              <UButton
                :label="t('governance_page_withdraw_button')"
                color="error"
                size="lg"
                block
                :loading="isLoading"
                :disabled="!withdrawAmount || isLoading"
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
  </NuxtLayout>
</template>

<script setup lang="ts">
import { formatUnits, parseUnits } from 'viem'

definePageMeta({
  layout: 'default',
})

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
const autoRestakeEnabled = ref(false)
const isLoading = ref(false)
const error = ref<string | null>(null)

async function handleLogin() {
  await accountStore.login()
}

async function handleClaimRewards() {
  try {
    isLoading.value = true
    error.value = null
    await restoreConnection()
    if (autoRestakeEnabled.value) {
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

function handleMaxWithdraw() {
  if (governanceData.veLikeBalance.value === 0n) return
  withdrawAmount.value = Number(formatUnits(governanceData.veLikeBalance.value, likeCoinTokenDecimals))
}
</script>
