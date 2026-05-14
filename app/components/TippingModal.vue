<template>
  <UModal
    :ui="{
      content: 'max-w-[390px] space-y-0 pt-8 pb-6 divide-y-0 rounded-xl',
    }"
    :close="{ onClick: handleSkip }"
  >
    <template #content>
      <div class="flex flex-col items-start px-6">
        <h3
          class="text-xl font-bold"
          v-text="$t('tipping_modal_title')"
        />

        <URadioGroup
          v-model="selectedTippingOption"
          class="w-full mt-6"
          :ui="{
            item: [
              'flex items-center w-full text-center rounded-full px-2 py-2',
              'has-data-[state=checked]:bg-theme-black',
              'has-data-[state=checked]:text-theme-50',
            ].join(' '),
            label: 'text-inherit',
          }"
          size="md"
          orientation="horizontal"
          variant="card"
          indicator="hidden"
          :items="tippingOptionRadioItems"
        >
          <template #label="{ item }">
            <span
              v-if="'value' in item && item.value !== -1"
              class="text-xs"
              v-text="props.currency"
            />&nbsp;<span class="text-md font-semibold">{{ 'label' in item ? item.label : '' }}</span>
          </template>
        </URadioGroup>

        <UInput
          v-if="selectedTippingOption === -1"
          v-model="tippingCustomAmount"
          class="w-full mt-2"
          size="xl"
          :placeholder="$t('tipping_modal_custom_amount_placeholder')"
          :ui="{ base: 'text-right' }"
        >
          <template #leading>
            <span
              class="text-sm"
              v-text="props.currency"
            />
          </template>
        </UInput>
      </div>

      <footer class="flex flex-col gap-2 px-6 mt-8">
        <UButton
          :label="$t('tipping_modal_send_tips_button')"
          color="primary"
          size="xl"
          block
          @click="handleSubmit"
        />
        <UButton
          :label="$t('tipping_modal_cancel_button')"
          variant="outline"
          size="xl"
          block
          @click="handleSkip"
        />
      </footer>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { RadioGroupItem } from '@nuxt/ui'

const { t: $t } = useI18n()

const DEFAULT_TIPPING_OPTIONS_BY_CURRENCY: Record<string, number[]> = {
  US: [5, 20, 100, -1],
}

const props = withDefaults(
  defineProps<{
    avatar?: string
    displayName?: string
    currency?: string
  }>(),
  {
    currency: 'US',
  },
)

const emit = defineEmits<{
  close: [payload: { tippingAmount: number | undefined }]
  submit: []
}>()

const tippingOptions = computed(() => {
  return DEFAULT_TIPPING_OPTIONS_BY_CURRENCY[props.currency] || []
})

const selectedTippingOption = ref(tippingOptions.value[0])
const tippingCustomAmount = ref(0)
const tippingAmount = computed(() => {
  return selectedTippingOption.value === -1 ? tippingCustomAmount.value : selectedTippingOption.value
})

const tippingOptionRadioItems = computed<RadioGroupItem[]>(() =>
  tippingOptions.value.map((price: number) => ({
    label: price === -1 ? $t('tipping_modal_custom_amount_placeholder') : `$${price.toLocaleString()}`,
    value: price,
  })),
)

function handleSubmit() {
  emit('close', { tippingAmount: tippingAmount.value })
}

function handleSkip() {
  emit('close', { tippingAmount: 0 })
}
</script>
