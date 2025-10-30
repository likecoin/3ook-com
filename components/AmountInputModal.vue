<template>
  <UModal
    class="max-w-[400px]"
    :title="title || $t('amount_input_modal_title')"
    :ui="{ footer: 'flex items-center justify-end' }"
  >
    <template #body>
      <UFormField
        class="mb-2"
        :label="label"
      >
        <UInput
          v-model="amountInput"
          type="number"
          :placeholder="$t('staking_amount_placeholder')"
          :min="0"
          step="0.000001"
          class="w-full"
          :ui="{ base: 'text-right' }"
        >
          <template #trailing>
            <span
              class="text-muted text-sm"
              v-text="ticker"
            />
          </template>
        </UInput>
      </UFormField>

      <div class="flex items-center justify-end gap-2">
        <UButton
          v-for="amount in quickAmounts"
          v-show="parseUnits(amount.toString(), LIKE_TOKEN_DECIMALS) <= max"
          :key="amount"
          :label="`${amount}`"
          color="neutral"
          variant="subtle"
          size="xs"
          @click="amountInput = amount"
        />
        <UButton
          :label="$t('amount_input_max')"
          color="neutral"
          variant="subtle"
          size="xs"
          @click="handleMaxButtonClick"
        />
      </div>
    </template>

    <template #footer>
      <UButton
        :label="confirmButtonTitle || $t('amount_input_confirm')"
        size="lg"
        :disabled="isConfirmButtonDisabled"
        @click="handleConfirmButtonClick"
      />
    </template>
  </UModal>
</template>

<script lang="ts" setup>
import { formatUnits, parseUnits } from 'viem'

import { LIKE_TOKEN_DECIMALS } from '~/shared/constants'

const quickAmounts = [1, 10, 100, 1000]

const props = withDefaults(defineProps<{
  title?: string
  label?: string
  max: bigint
  ticker?: string
  confirmButtonTitle?: string
}>(), {
  ticker: 'LIKE',
})

const emit = defineEmits(['close'])

const amountInput = ref(0)

const isConfirmButtonDisabled = computed(() => amountInput.value <= 0n || amountInput.value > props.max)

function handleMaxButtonClick() {
  amountInput.value = Math.floor(Number(formatUnits(props.max, LIKE_TOKEN_DECIMALS)))
}

function handleConfirmButtonClick() {
  if (isConfirmButtonDisabled.value) return
  emit('close', amountInput.value)
}
</script>
