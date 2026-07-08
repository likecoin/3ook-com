<template>
  <section
    v-if="hasLoggedIn && (likeBalance > 0n || !!user?.likeWallet)"
    class="space-y-3"
  >
    <UCard :ui="{ body: '!p-0 divide-y-1 divide-(--ui-border)' }">
      <AccountSettingsItem
        v-if="!isApp || likeBalance > 0n"
        :label="$t('account_page_likecoin')"
      >
        <template #label-prepend>
          <img
            class="w-5 h-5"
            :src="likeCoinTokenImage"
            :alt="$t('account_page_likecoin')"
          >
        </template>

        <BalanceLabel
          class="text-sm text-muted"
          :value="formattedLikeBalance"
        />

        <template #right>
          <UButton
            :to="localeRoute({ name: 'account-deposit' })"
            :label="$t('account_page_governance_button')"
            color="neutral"
            variant="outline"
            size="lg"
          />
        </template>
      </AccountSettingsItem>

      <AccountSettingsItem
        v-if="!isApp || likeBalance > 0n"
        :label="$t('account_page_staking_reward')"
        icon="i-material-symbols-auto-graph-rounded"
      >
        <BalanceLabel
          class="text-sm text-muted"
          :value="formattedTotalStakingRewards"
        />

        <template #right>
          <UButton
            :label="$t('account_page_staking_reward_claim_button')"
            color="neutral"
            variant="outline"
            size="lg"
            :disabled="totalUnclaimedRewards <= 0n"
            loading-auto
            @click="handleClaimStakingRewardButtonClick"
          />
        </template>
      </AccountSettingsItem>

      <AccountSettingsItem
        v-if="user?.likeWallet"
        icon="i-material-symbols-key-outline-rounded"
        :label="$t('account_page_cosmos_wallet')"
      >
        <UTooltip :text="user.likeWallet">
          <UButton
            class="-ml-2 text-xs/5 font-mono"
            :label="shortenWalletAddress(user.likeWallet)"
            trailing-icon="i-material-symbols-open-in-new-rounded"
            :to="likeWalletButtonTo"
            external
            target="_blank"
            variant="ghost"
            color="neutral"
            size="xs"
            @click="handleLikeWalletClick"
          />
        </UTooltip>

        <template #right>
          <UButton
            :label="$t('account_page_migrate_legacy_book')"
            trailing-icon="i-material-symbols-open-in-new-rounded"
            :to="config.public.likeCoinV3BookMigrationSiteURL"
            external
            target="_blank"
            variant="outline"
            color="neutral"
            size="xs"
            @click="handleMigrateLegacyBookButtonClick"
          />
        </template>
      </AccountSettingsItem>
    </UCard>
  </section>
</template>

<script setup lang="ts">
import { formatUnits } from 'viem'
import likeCoinTokenImage from '~/assets/images/likecoin-token.png'

const config = useRuntimeConfig()
const { t: $t, locale } = useI18n()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const accountStore = useAccountStore()
const stakingStore = useStakingStore()
const bookshelfStore = useBookshelfStore()
const localeRoute = useLocaleRoute()
const { handleError } = useErrorHandler()
const toast = useToast()
const { isApp } = useAppDetection()

const walletAddress = computed(() => user.value?.evmWallet)
const {
  likeBalance,
  formattedLikeBalance,
  refetch: refetchLikeBalance,
} = useLikeCoinBalance(walletAddress)
const { claimWalletRewards } = useLikeCollectiveContract()
const waitForTransaction = useWaitForTransaction()

const likeWalletButtonTo = computed(() => {
  if (!user.value?.likeWallet) return undefined
  return `${config.public.likerLandSiteURL}/${locale.value}/${user.value.likeWallet}?tab=collected`
})

const formattedTotalStakingRewards = computed(() => {
  return user.value ? stakingStore.getFormattedTotalRewards(user.value.evmWallet) : '0'
})

const stakingData = computed(() => {
  return user.value
    ? stakingStore.getUserStakingData(user.value.evmWallet)
    : {
        items: [],
        totalUnclaimedRewards: 0n,
        isFetching: false,
        hasFetched: false,
      }
})

const totalUnclaimedRewards = computed(() => stakingData.value.totalUnclaimedRewards)

function handleLikeWalletClick() {
  useLogEvent('account_like_wallet_click')
}

function handleMigrateLegacyBookButtonClick() {
  useLogEvent('migrate_legacy_book_button_click')
}

async function handleClaimStakingRewardButtonClick() {
  useLogEvent('account_claim_reward_button_click')

  if (!user.value?.evmWallet || totalUnclaimedRewards.value <= 0n) return

  try {
    await accountStore.restoreConnection()

    const hash = await claimWalletRewards(user.value.evmWallet)
    await waitForTransaction(hash)

    toast.add({
      title: $t('staking_claim_all_rewards_success'),
      color: 'success',
      icon: 'i-material-symbols-check-circle',
    })

    useLogEvent('staking_claim_all_rewards_success', {
      total_amount: formatUnits(totalUnclaimedRewards.value, config.public.likeCoinTokenDecimals),
      book_count: bookshelfStore.items.length,
    })

    // Reload data to refresh rewards
    if (user.value?.evmWallet) {
      await Promise.all([
        stakingStore.fetchUserStakingData(user.value.evmWallet),
        bookshelfStore.fetchItems({ walletAddress: user.value.evmWallet, isRefresh: true }),
        refetchLikeBalance(),
      ])
    }
  }
  catch (error) {
    await handleError(error, {
      title: $t('staking_claim_all_rewards_error'),
    })
  }
}
</script>
