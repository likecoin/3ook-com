<template>
  <div class="flex flex-col gap-4 p-4 bg-white rounded-lg shadow-[0px_10px_20px_0px_rgba(0,0,0,0.04)]">
    <h2
      class="font-semibold tablet:text-lg"
      v-text="$t('staking_stake_on_book_title')"
    />

    <!-- Total Stake Display -->
    <UCard
      :ui="{
        header: 'flex flex-col items-center justify-center',
        body: 'flex items-center justify-between text-sm !py-2',
        footer: 'flex justify-between items-center text-sm py-3 bg-theme-cyan/20',
      }"
    >
      <template #header>
        <BalanceLabel
          class="text-2xl font-bold"
          :value="formattedTotalStake"
        />
        <div
          class="mt-1 text-sm text-muted"
          v-text="$t('staking_total_staked')"
        />
      </template>

      <!-- Current Stake -->
      <template
        v-if="hasLoggedIn"
        #default
      >
        <span
          class="font-semibold"
          v-text="$t('staking_your_current_stake')"
        />
        <BalanceLabel :value="formattedUserStake" />
      </template>

      <!-- Pending Rewards (logged in only) -->
      <template
        v-if="hasLoggedIn && pendingRewards > 0n"
        #footer
      >
        <div class="flex flex-col gap-1">
          <div
            class="font-semibold"
            v-text="$t('staking_pending_rewards')"
          />
          <BalanceLabel :value="formattedPendingRewards" />
        </div>

        <UButton
          :label="$t('staking_claim_rewards')"
          color="primary"
          size="lg"
          :loading="isClaimingRewards"
          @click="handleClaimRewards"
        />
      </template>
    </UCard>

    <footer class="grid grid-cols-2 gap-2">
      <template v-if="hasLoggedIn">
        <UButton
          class="col-span-1"
          :label="$t('staking_stake_button')"
          size="lg"
          :loading="isStaking"
          :disabled="isStaking"
          block
          @click="handleStakeButtonClick"
        />

        <UButton
          class="col-span-1"
          :label="$t('staking_unstake_button')"
          variant="outline"
          color="neutral"
          size="lg"
          :loading="isUnstakingAmount"
          :disabled="userStake <= 0n"
          block
          @click="handleUnstakeButtonClick"
        />
      </template>

      <!-- Login Button (not logged in) -->
      <UButton
        v-else
        class="col-span-full"
        :label="$t('staking_connect_wallet_to_stake')"
        size="lg"
        block
        @click="handleConnectWallet"
      />

      <!-- Donate Button (testnet only) -->
      <UButton
        v-if="hasLoggedIn && isTestnet"
        class="col-span-full"
        :label="$t('donate_reward_button')"
        icon="i-material-symbols-volunteer-activism"
        variant="ghost"
        size="sm"
        :loading="isDonating"
        :disabled="isDonating"
        block
        @click="handleDonateButtonClick"
      />
    </footer>
  </div>
</template>

<script setup lang="ts">
import { parseUnits } from 'viem'

import { AmountInputModal } from '#components'

const props = defineProps<{
  nftClassId: string
}>()

const config = useRuntimeConfig()
const { likeCoinTokenDecimals, isTestnet } = config.public

const { t: $t } = useI18n()
const toast = useToast()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const walletAddress = computed(() => user.value?.evmWallet as `0x${string}` | undefined)

const {
  unstakeAmountFromNFTClass,
  stakeToNFTClass,
  depositReward,
} = useLikeStaking()

const accountStore = useAccountStore()
const { handleError } = useErrorHandler()
const overlay = useOverlay()
const amountInputModal = overlay.create(AmountInputModal)

const nftClassIdComputed = computed(() => props.nftClassId)
const {
  userStake,
  pendingRewards,
  isClaimingRewards,
  formattedTotalStake,
  formattedUserStake,
  formattedPendingRewards,
  handleClaimRewards,
  loadStakingData,
} = useNFTClassStakingData(nftClassIdComputed)

const { login, restoreConnection } = accountStore

// Staking state
const stakeAmount = ref(0)
const isStaking = ref(false)
const isUnstakingAmount = ref(false)
const isDonating = ref(false)

const {
  likeBalance,
  formattedLikeBalance,
} = useLikeCoinBalance(walletAddress)

const isValidStakeAmount = computed(() => {
  return stakeAmount.value > 0
})

onMounted(async () => {
  await loadStakingData()
})

async function handleConnectWallet() {
  try {
    await login()
    useLogEvent('stake_connect_wallet', { nft_class_id: props.nftClassId })
  }
  catch (error) {
    await handleError(error)
  }
}

async function handleStakeButtonClick() {
  await restoreConnection()

  stakeAmount.value = await amountInputModal.open({
    title: $t('staking_stake_please_enter_amount'),
    max: likeBalance.value,
  }).result

  if (!isValidStakeAmount.value) return

  try {
    isStaking.value = true
    const amount = parseUnits(stakeAmount.value.toString(), likeCoinTokenDecimals)

    if (amount > likeBalance.value) {
      toast.add({
        title: $t('error_insufficient_amount'),
        description: $t('error_insufficient_amount_description', {
          amount: stakeAmount.value,
          balance: formattedLikeBalance.value,
        }),
        color: 'error',
        icon: 'i-material-symbols-error-outline',
      })
      return
    }

    await stakeToNFTClass(user.value!.evmWallet, props.nftClassId, amount)

    toast.add({
      title: $t('staking_stake_success'),
      color: 'success',
      icon: 'i-material-symbols-check-circle',
    })

    useLogEvent('stake_success', {
      nft_class_id: props.nftClassId,
      amount: stakeAmount.value,
    })

    stakeAmount.value = 0
    await loadStakingData()
  }
  catch (error) {
    await handleError(error, {
      title: $t('staking_stake_error'),
    })
  }
  finally {
    isStaking.value = false
  }
}

async function handleUnstakeButtonClick() {
  await restoreConnection()

  stakeAmount.value = await amountInputModal.open({
    title: $t('staking_unstake_please_input_amount'),
    max: userStake.value,
  }).result

  if (!isValidStakeAmount.value) return

  try {
    isUnstakingAmount.value = true
    const amount = parseUnits(stakeAmount.value.toString(), likeCoinTokenDecimals)

    if (amount > userStake.value) {
      toast.add({
        title: $t('error_unstake_amount_exceeded'),
        description: $t('error_unstake_amount_exceeded_description', { amount: formattedUserStake.value }),
        color: 'error',
        icon: 'i-material-symbols-error-outline',
      })
      return
    }

    await unstakeAmountFromNFTClass(user.value!.evmWallet, props.nftClassId, amount)

    toast.add({
      title: $t('staking_unstake_success'),
      color: 'success',
      icon: 'i-material-symbols-check-circle',
    })

    useLogEvent('unstake_amount_success', {
      nft_class_id: props.nftClassId,
      amount: stakeAmount.value,
    })

    stakeAmount.value = 0
    await loadStakingData()
  }
  catch (error) {
    await handleError(error, {
      title: $t('staking_unstake_error'),
    })
  }
  finally {
    isUnstakingAmount.value = false
  }
}

async function handleDonateButtonClick() {
  await restoreConnection()

  stakeAmount.value = await amountInputModal.open({
    title: $t('donate_reward_please_input_amount'),
    max: userStake.value,
  }).result

  if (!isValidStakeAmount.value) return

  try {
    isDonating.value = true
    const amount = parseUnits(stakeAmount.value.toString(), likeCoinTokenDecimals)

    await depositReward(user.value!.evmWallet, props.nftClassId, amount)

    toast.add({
      title: $t('donate_reward_success'),
      color: 'success',
      icon: 'i-material-symbols-check-circle',
    })

    useLogEvent('donate_reward_success', {
      nft_class_id: props.nftClassId,
      amount: stakeAmount.value,
    })

    stakeAmount.value = 0
    await loadStakingData()
  }
  catch (error) {
    await handleError(error, {
      title: $t('donate_reward_error'),
    })
  }
  finally {
    isDonating.value = false
  }
}
</script>
