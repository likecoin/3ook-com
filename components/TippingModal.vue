<template>
  <UModal
    :ui="{
      content: 'max-w-[320px] space-y-0 pt-6 pb-8 divide-y-0',
    }"
    :close="{ onClick: handleSkip }"
  >
    <template #content>
      <header>
        <div
          class="flex flex-col items-center justify-end bg-cover bg-no-repeat bg-center h-[116px]"
          :style="{ backgroundImage: `url(${TippingHeaderBackground})` }"
        >
          <UAvatar
            class="size-22 mb-2 bg-white ring-4 ring-[#EBEBEB]"
            :alt="displayName"
            :src="props.avatar"
          />
        </div>
        <div
          class="text-sm font-semibold text-center"
          v-text="displayName"
        />
      </header>

      <div class="flex flex-col items-center mt-6 px-6 text-center">
        <h3
          class="text-xl font-semibold"
          v-text="$t('tipping_modal_title')"
        />
        <p
          class="text-xs mt-2"
          v-text="$t('tipping_modal_description', { displayName })"
        />

        <URadioGroup
          v-model="tippingAmount"
          class="w-full mt-6"
          :ui="{
            item: 'flex items-center w-full text-center',
            label: 'text-lg font-semibold',
            description: 'text-xs',
          }"
          size="md"
          orientation="horizontal"
          variant="card"
          indicator="hidden"
          :items="items"
        />

        <UInput
          v-model="tippingAmount"
          class="w-full mt-2"
          size="xl"
          :placeholder="$t('tipping_modal_custom_amount_placeholder')"
        >
          <template #trailing>
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
          variant="ghost"
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

import TippingHeaderBackground from '~/assets/images/tipping/avatar-bg.png'

const { t: $t } = useI18n()

const DEFAULT_TIPPING_PRICES_BY_CURRENCY: Record<string, number[]> = {
  USD: [5, 20, 100],
}

const props = withDefaults(
  defineProps<{
    avatar?: string
    displayName?: string
    currency?: string
  }>(),
  {
    currency: 'USD',
  },
)

const emit = defineEmits<{
  close: [payload: { tippingAmount: number | undefined }]
  submit: []
}>()

const tippingPrices = computed(() => {
  return DEFAULT_TIPPING_PRICES_BY_CURRENCY[props.currency] || []
})

const tippingAmount = ref(tippingPrices.value[1])

const items = computed<RadioGroupItem[]>(() =>
  tippingPrices.value.map((price: number) => ({
    label: price.toString(),
    description: props.currency,
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
