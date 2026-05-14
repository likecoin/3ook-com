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
        :help="helpText"
        :ui="{ help: 'text-xs text-right' }"
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
          v-show="parseUnits(amount.toString(), likeCoinTokenDecimals) <= max"
          :key="amount"
          :label="`${amount}`"
          color="neutral"
          variant="subtle"
          size="xs"
          @click="amountInput = amount"
        />
        <UTooltip :text="formattedMaxAmount">
          <UButton
            :label="maxButtonLabel || $t('amount_input_max')"
            color="neutral"
            variant="subtle"
            size="xs"
            @click="handleMaxButtonClick"
          />
        </UTooltip>
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

const { likeCoinTokenDecimals, likeCoinTokenSymbol } = useRuntimeConfig().public

const quickAmounts = [1, 10, 100, 1000]

const props = withDefaults(defineProps<{
  title?: string
  label?: string
  max: bigint
  maxButtonLabel?: string
  ticker?: string
  confirmButtonTitle?: string
  helpText?: string
}>(), {
  ticker: '',
})

const ticker = computed(() => props.ticker || likeCoinTokenSymbol)

const emit = defineEmits(['close'])

const amountInput = ref(0)

const amountInputInWei = computed(() => parseUnits(amountInput.value.toString(), likeCoinTokenDecimals))
const isConfirmButtonDisabled = computed(() => amountInput.value <= 0 || amountInputInWei.value > props.max)

const maxAmount = computed(() => {
  return Math.floor(Number(formatUnits(props.max, likeCoinTokenDecimals)) * 100) / 100
})

const formattedMaxAmount = computed(() => {
  return maxAmount.value.toLocaleString(undefined, { maximumFractionDigits: 2 }).concat(` ${likeCoinTokenSymbol}`)
})

function handleMaxButtonClick() {
  amountInput.value = maxAmount.value
}

function handleConfirmButtonClick() {
  if (isConfirmButtonDisabled.value) return
  emit('close', amountInput.value)
}
</script>
