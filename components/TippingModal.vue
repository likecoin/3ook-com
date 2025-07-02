<template>
  <UModal
    :ui="{
      content: 'max-w-[400px] space-y-8 p-6',
      footer: 'flex justify-end',
    }"
    :close="{ onClick: handleSkip }"
  >
    <template #content>
      <div class="flex flex-col items-center gap-[38px] w-full">
        <div class="relative">
          <img
            class="object-cover w-full h-[104px]"
            src="~/assets/images/tipping/avatar-bg.png"
            alt=""
          >
          <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-7 flex flex-col items-center gap-1">
            <UAvatar
              class="size-16 mb-2"
              :alt="displayName"
              :src="props.avatar"
            />
            <div class="text-sm font-semibold text-center">
              {{ displayName }}
            </div>
          </div>
        </div>

        <div class="flex flex-col justify-center items-center px-12 gap-4">
          <div class="flex flex-col text-center gap-1">
            <h3 class="text-xl font-semibold">
              {{ $t('tipping_modal_title') }}
            </h3>
            <p class="text-xs">
              {{ $t('tipping_modal_description', { displayName }) }}
            </p>
          </div>
          <URadioGroup
            v-model="tippingAmount"
            :ui="{
              wrapper: 'w-full',
              item: 'w-full flex items-center text-center w-15',
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
            class="w-full"
            placeholder="自訂金額"
          >
            <template #trailing>
              <span class="text-sm">{{ props.currency }}</span>
            </template>
          </UInput>

          <UButton
            :label="$t('tipping_modal_send_tips_button')"
            color="primary"
            size="xl"
            @click="handleSubmit"
          />
          <UButton
            :label="$t('tipping_modal_cancel_button')"
            size="xl"
            variant="ghost"
            @click="handleSkip"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { RadioGroupItem } from '@nuxt/ui'

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
