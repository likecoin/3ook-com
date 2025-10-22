<template>
  <div class="relative w-full shrink-0">
    <div class="sticky top-0 pt-5">
      <div class="bg-white p-4 pb-8 rounded-lg shadow-[0px_10px_20px_0px_rgba(0,0,0,0.04)]">
        <h2
          class="font-semibold text-lg"
          v-text="$t('staking_stake_on_book_title')"
        />

        <!-- Total Stake Display -->
        <div class="mt-4 p-3 bg-gray-50 rounded-lg">
          <div class="text-center">
            <div class="text-2xl font-bold text-theme-500">
              {{ formattedTotalStake }}
            </div>
            <div class="text-xs text-gray-600 mt-1">
              {{ $t('staking_total_staked') }}
            </div>
          </div>
        </div>

        <!-- User Stats (logged in only) -->
        <div
          v-if="hasLoggedIn"
          class="mt-3 space-y-2"
        >
          <!-- Current Stake -->
          <div class="flex justify-between items-center p-2 bg-blue-50 rounded text-sm">
            <span class="text-gray-600">{{ $t('staking_your_current_stake') }}</span>
            <span class="font-semibold text-blue-600">{{ formattedUserStake }} LIKE</span>
          </div>

          <!-- Pending Rewards -->
          <div
            v-if="pendingRewards > 0n"
            class="flex justify-between items-center p-2 bg-green-50 rounded text-sm"
          >
            <div>
              <div class="text-gray-600">
                {{ $t('staking_pending_rewards') }}
              </div>
              <div class="font-semibold text-green-600">
                {{ formattedPendingRewards }} LIKE
              </div>
            </div>
            <UButton
              label="Claim"
              color="success"
              size="xs"
              :loading="isClaimingRewards"
              @click="handleClaimRewards"
            />
          </div>
        </div>

        <!-- Stake Only (no tabs when no stake) -->
        <div
          v-if="hasLoggedIn && userStake === 0n"
          class="mt-4 py-3"
        >
          <label class="text-sm text-gray-600 mb-1 block">
            Amount (LIKE)
          </label>
          <UInput
            v-model="stakeAmount"
            type="number"
            :placeholder="$t('staking_amount_placeholder')"
            :min="0"
            step="0.000001"
            class="mb-2"
          >
            <template #trailing>
              <span class="text-gray-400 text-sm">LIKE</span>
            </template>
          </UInput>

          <div class="flex gap-2 mb-4">
            <UButton
              v-for="amount in quickAmounts"
              v-show="parseUnits(amount.toString(), LIKE_TOKEN_DECIMALS) <= likeBalance"
              :key="amount"
              :label="`${amount}`"
              variant="outline"
              size="xs"
              @click="stakeAmount = amount"
            />
            <UButton
              label="Max"
              variant="outline"
              size="xs"
              @click="stakeAmount = Math.floor(Number(formatUnits(likeBalance, LIKE_TOKEN_DECIMALS)))"
            />
          </div>

          <UButton
            label="Stake"
            size="lg"
            :loading="isStaking"
            :disabled="!isValidStakeAmount || isStaking"
            block
            @click="handleStake"
          />
        </div>

        <!-- Stake/Unstake Tabs (when user has stake) -->
        <UTabs
          v-if="hasLoggedIn && userStake > 0n"
          :items="[{ label: 'Stake', slot: 'stake' }, { label: 'Unstake', slot: 'unstake' }]"
          class="mt-4"
        >
          <template #stake>
            <div class="py-3">
              <label class="text-sm text-gray-600 mb-1 block">
                Amount (LIKE)
              </label>
              <UInput
                v-model="stakeAmount"
                type="number"
                :placeholder="$t('staking_amount_placeholder')"
                :min="0"
                step="0.000001"
                class="mb-2"
              >
                <template #trailing>
                  <span class="text-gray-400 text-sm">LIKE</span>
                </template>
              </UInput>

              <div class="flex gap-2 mb-4">
                <UButton
                  v-for="amount in quickAmounts"
                  v-show="parseUnits(amount.toString(), LIKE_TOKEN_DECIMALS) <= likeBalance"
                  :key="amount"
                  :label="`${amount}`"
                  variant="outline"
                  size="xs"
                  @click="stakeAmount = amount"
                />
                <UButton
                  label="Max"
                  variant="outline"
                  size="xs"
                  @click="stakeAmount = Math.floor(Number(formatUnits(likeBalance, LIKE_TOKEN_DECIMALS)))"
                />
              </div>

              <UButton
                label="Stake"
                size="lg"
                :loading="isStaking"
                :disabled="!isValidStakeAmount || isStaking"
                block
                @click="handleStake"
              />
            </div>
          </template>

          <template #unstake>
            <div class="py-3">
              <label class="text-sm text-gray-600 mb-1 block">
                Amount (LIKE)
              </label>
              <UInput
                v-model="stakeAmount"
                type="number"
                :placeholder="$t('staking_amount_placeholder')"
                :min="0"
                :max="Number(formatUnits(userStake, LIKE_TOKEN_DECIMALS))"
                step="0.000001"
                class="mb-2"
              >
                <template #trailing>
                  <span class="text-gray-400 text-sm">LIKE</span>
                </template>
              </UInput>

              <div class="flex gap-2 mb-4">
                <UButton
                  v-for="amount in quickAmounts"
                  v-show="parseUnits(amount.toString(), LIKE_TOKEN_DECIMALS) <= userStake"
                  :key="amount"
                  :label="`${amount}`"
                  variant="outline"
                  size="xs"
                  @click="stakeAmount = amount"
                />
                <UButton
                  label="Max"
                  variant="outline"
                  size="xs"
                  @click="stakeAmount = Number(formatUnits(userStake, LIKE_TOKEN_DECIMALS))"
                />
              </div>

              <UButton
                label="Unstake"
                variant="outline"
                color="neutral"
                size="lg"
                :loading="isUnstakingAmount"
                :disabled="!isValidStakeAmount || isUnstakingAmount"
                block
                @click="handleUnstakeAmount"
              />
            </div>
          </template>
        </UTabs>

        <!-- Login Button (not logged in) -->
        <UButton
          v-if="!hasLoggedIn"
          :label="$t('staking_connect_wallet_to_stake')"
          size="lg"
          block
          class="mt-4"
          @click="handleConnectWallet"
        />

        <!-- Donate Button (for testing) -->
        <UButton
          v-if="hasLoggedIn"
          size="sm"
          variant="ghost"
          icon="i-material-symbols-volunteer-activism"
          label="Donate Reward"
          :loading="isDonating"
          :disabled="!isValidStakeAmount || isDonating"
          block
          class="mt-2"
          @click="handleDonate"
        />
      </div>

      <ul class="flex justify-center items-center gap-2 mt-4">
        <li
          v-for="button in socialButtons"
          :key="button.icon"
        >
          <UTooltip
            :delay-duration="0"
            :text="button.label"
          >
            <UButton
              color="neutral"
              variant="outline"
              size="xs"
              :icon="button.icon"
              :disabled="!button.isEnabled"
              :ui="{ base: 'p-2 rounded-full' }"
              @click="handleSocialButtonClick(button.key)"
            />
          </UTooltip>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatUnits, parseUnits } from 'viem'
import { useBalance } from '@wagmi/vue'
import { LIKE_TOKEN_DECIMALS } from '~/shared/constants'

const props = defineProps<{
  nftClassId: string
}>()

const { t: $t } = useI18n()
const toast = useToast()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const walletAddress = computed(() => user.value?.evmWallet as `0x${string}` | undefined)

const {
  unstakeAmountFromNFTClass,
  claimWalletRewardsOfNFTClass,
  stakeToNFTClass,
  depositReward,
  likeCoinErc20Address,
} = useLikeStaking()

const { data: likeBalanceData } = useBalance({
  address: walletAddress,
  token: likeCoinErc20Address as `0x${string}`,
})

const accountStore = useAccountStore()
const { handleError } = useErrorHandler()

const {
  getWalletPendingRewardsOfNFTClass,
  getWalletStakeOfNFTClass,
  getTotalStakeOfNFTClass,
} = useLikeCollectiveContract()

const { login, restoreConnection } = accountStore

// Staking state
const totalStake = ref(0n)
const userStake = ref(0n)
const pendingRewards = ref(0n)
const stakeAmount = ref(0)
const isStaking = ref(false)
const isUnstakingAmount = ref(false)
const isClaimingRewards = ref(false)
const isDonating = ref(false)

const likeBalance = computed(() => likeBalanceData.value?.value || 0n)

// Load staking data
async function loadStakingData() {
  try {
    totalStake.value = await getTotalStakeOfNFTClass(props.nftClassId)

    if (hasLoggedIn.value && user.value?.evmWallet) {
      const [userStakeAmount, pendingRewardsAmount] = await Promise.all([
        getWalletStakeOfNFTClass(user.value.evmWallet, props.nftClassId),
        getWalletPendingRewardsOfNFTClass(user.value.evmWallet, props.nftClassId),
      ])
      userStake.value = userStakeAmount
      pendingRewards.value = pendingRewardsAmount
    }
  }
  catch (error) {
    console.error('Failed to load staking data:', error)
  }
}

// Computed values
const formattedTotalStake = computed(() => {
  return Number(formatUnits(totalStake.value, LIKE_TOKEN_DECIMALS)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
})

const formattedUserStake = computed(() => {
  return Number(formatUnits(userStake.value, LIKE_TOKEN_DECIMALS)).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })
})

const formattedPendingRewards = computed(() => {
  return Number(formatUnits(pendingRewards.value, LIKE_TOKEN_DECIMALS)).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })
})

const formattedLikeBalance = computed(() => {
  return Number(formatUnits(likeBalance.value, LIKE_TOKEN_DECIMALS)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })
})

const quickAmounts = [1, 10, 100, 1000]

const isValidStakeAmount = computed(() => {
  return stakeAmount.value > 0
})

const socialButtons = computed(() => [
  { key: 'copy-links', label: $t('share_button_hint_copy_link'), icon: 'i-material-symbols-link-rounded', isEnabled: true },
  { key: 'threads', label: $t('share_button_hint_threads'), icon: 'i-simple-icons-threads' },
  { key: 'facebook', label: $t('share_button_hint_facebook'), icon: 'i-simple-icons-facebook' },
  { key: 'whatsapp', label: $t('share_button_hint_whatsapp'), icon: 'i-simple-icons-whatsapp' },
  { key: 'x', label: $t('share_button_hint_x'), icon: 'i-simple-icons-x' },
])

onMounted(async () => {
  await loadStakingData()
})

watch(hasLoggedIn, async (isLoggedIn) => {
  if (isLoggedIn) {
    await loadStakingData()
  }
  else {
    userStake.value = 0n
    pendingRewards.value = 0n
  }
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

async function handleStake() {
  await restoreConnection()

  if (stakeAmount.value <= 0) {
    toast.add({
      title: $t('staking_please_enter_amount'),
      color: 'warning',
      icon: 'i-material-symbols-warning-outline',
    })
    return
  }

  if (!isValidStakeAmount.value) return

  try {
    isStaking.value = true
    const amount = parseUnits(stakeAmount.value.toString(), LIKE_TOKEN_DECIMALS)

    if (amount > likeBalance.value) {
      toast.add({
        title: 'Insufficient LIKE balance',
        description: `You need ${stakeAmount.value} LIKE but only have ${formattedLikeBalance.value} LIKE`,
        color: 'error',
        icon: 'i-material-symbols-error-outline',
      })
      return
    }

    await stakeToNFTClass(user.value!.evmWallet, props.nftClassId, amount)
    await sleep(3000)

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

async function handleUnstakeAmount() {
  await restoreConnection()

  if (stakeAmount.value <= 0) {
    toast.add({
      title: 'Please enter amount to unstake',
      color: 'warning',
      icon: 'i-material-symbols-warning-outline',
    })
    return
  }

  if (!isValidStakeAmount.value) return

  try {
    isUnstakingAmount.value = true
    const amount = parseUnits(stakeAmount.value.toString(), LIKE_TOKEN_DECIMALS)

    if (amount > userStake.value) {
      toast.add({
        title: 'Amount exceeds your stake',
        description: `You can only unstake up to ${formattedUserStake.value} LIKE`,
        color: 'error',
        icon: 'i-material-symbols-error-outline',
      })
      return
    }

    await unstakeAmountFromNFTClass(user.value!.evmWallet, props.nftClassId, amount)
    await sleep(3000)

    toast.add({
      title: 'Unstake successful',
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
      title: 'Unstake failed',
    })
  }
  finally {
    isUnstakingAmount.value = false
  }
}

async function handleClaimRewards() {
  try {
    isClaimingRewards.value = true

    await claimWalletRewardsOfNFTClass(user.value!.evmWallet, props.nftClassId)

    toast.add({
      title: $t('staking_claim_rewards_success'),
      color: 'success',
      icon: 'i-material-symbols-check-circle',
    })

    useLogEvent('claim_rewards_success', {
      nft_class_id: props.nftClassId,
      amount: formatUnits(pendingRewards.value, LIKE_TOKEN_DECIMALS),
    })

    await loadStakingData()
  }
  catch (error) {
    await handleError(error, {
      title: $t('staking_claim_rewards_error'),
    })
  }
  finally {
    isClaimingRewards.value = false
  }
}

async function handleDonate() {
  await restoreConnection()

  if (stakeAmount.value <= 0) {
    toast.add({
      title: 'Please enter donation amount',
      color: 'warning',
      icon: 'i-material-symbols-warning-outline',
    })
    return
  }

  if (!isValidStakeAmount.value) return

  try {
    isDonating.value = true
    const amount = parseUnits(stakeAmount.value.toString(), LIKE_TOKEN_DECIMALS)

    await depositReward(props.nftClassId, amount)

    toast.add({
      title: 'Donation successful!',
      color: 'success',
      icon: 'i-material-symbols-check-circle',
    })

    useLogEvent('donate_success', {
      nft_class_id: props.nftClassId,
      amount: stakeAmount.value,
    })

    stakeAmount.value = 0
    await loadStakingData()
  }
  catch (error) {
    await handleError(error, {
      title: 'Donation failed',
    })
  }
  finally {
    isDonating.value = false
  }
}

async function handleSocialButtonClick(key: string) {
  switch (key) {
    case 'copy-links':
      try {
        await navigator.clipboard.writeText(window.location.href)
        toast.add({
          title: $t('copy_link_success'),
          duration: 3000,
          icon: 'i-material-symbols-link-rounded',
          color: 'success',
        })
      }
      catch (error) {
        console.error('Failed to copy link:', error)
        toast.add({
          title: $t('copy_link_failed'),
          icon: 'i-material-symbols-error-circle-rounded',
          duration: 3000,
          color: 'error',
        })
      }
      break
    case 'threads':
      // TODO: Handle Threads
      break
    case 'facebook':
      // TODO: Handle Facebook
      break
    case 'whatsapp':
      // TODO: Handle WhatsApp
      break
    case 'x':
      // TODO: Handle X
      break
    default:
  }
}
</script>
