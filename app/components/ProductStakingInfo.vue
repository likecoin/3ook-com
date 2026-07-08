<template>
  <StakingControl
    class="tablet:hidden"
    :nft-class-id="nftClassId"
    :is-control-hidden="isApp"
  />
  <div class="max-tablet:hidden space-y-4 text-highlighted">
    <div class="grid grid-cols-1 tablet:grid-cols-2 gap-4">
      <UCard :ui="{ body: 'p-4' }">
        <div class="text-center">
          <BalanceLabel
            class="text-2xl"
            :value="formattedTotalStake"
            :is-compact="true"
          />
          <div
            class="mt-1 text-sm text-muted"
            v-text="$t('staking_total_staked')"
          />
        </div>
      </UCard>
      <UCard :ui="{ body: 'p-4' }">
        <div class="text-center">
          <div
            class="text-2xl font-semibold"
            v-text="numberOfStakers.toLocaleString()"
          />
          <div
            class="mt-1 text-sm text-muted"
            v-text="$t('staking_total_stakers')"
          />
        </div>
      </UCard>
      <UCard
        v-if="stakingRank > 0"
        :ui="{ body: 'p-4' }"
      >
        <div class="text-center">
          <div class="text-2xl font-semibold">
            #{{ stakingRank }}
          </div>
          <div
            class="mt-1 text-sm text-muted"
            v-text="$t('staking_like_rank')"
          />
        </div>
      </UCard>
      <UCard
        v-if="hasLoggedIn"
        :ui="{ body: 'p-4' }"
      >
        <div class="text-center">
          <BalanceLabel
            class="text-2xl"
            :value="formattedUserStake"
            :is-compact="true"
          />

          <div
            class="mt-1 text-sm text-muted"
            v-text="$t('staking_your_stake')"
          />
        </div>
      </UCard>
    </div>

    <div
      v-if="hasLoggedIn && pendingRewards > 0n"
      class="mt-4"
    >
      <UCard :ui="{ body: 'p-4' }">
        <div class="flex justify-between items-center">
          <div>
            <BalanceLabel
              class="text-2xl"
              :value="formattedPendingRewards"
            />
            <div
              class="mt-1 text-sm text-muted"
              v-text="$t('staking_pending_rewards')"
            />
          </div>
          <UButton
            v-if="!isApp"
            :label="$t('staking_claim_rewards')"
            color="primary"
            variant="outline"
            :loading="isClaimingRewards"
            @click="handleClaimRewards"
          />
        </div>
      </UCard>
    </div>

    <div class="mt-6">
      <NuxtLink
        :to="localeRoute({ name: 'about', hash: '#curate-to-earn' })"
        class="inline-flex items-center gap-1 text-sm hover:underline"
      >
        <UIcon
          name="i-material-symbols-help-outline-rounded"
          size="16"
        />
        <span>{{ $t('staking_learn_more') }}</span>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  nftClassId: string
}>()

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const { isApp } = useAppDetection()
const { loggedIn: hasLoggedIn } = useUserSession()

// Read state proxies the shared staking store, which the product page
// populates via its own loadStakingData call.
const {
  pendingRewards,
  isClaimingRewards,
  formattedTotalStake,
  formattedUserStake,
  formattedPendingRewards,
  numberOfStakers,
  stakingRank,
  handleClaimRewards,
} = useNFTClassStakingData(computed(() => props.nftClassId))
</script>
