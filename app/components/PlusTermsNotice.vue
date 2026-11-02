<template>
  <i18n-t
    :keypath="props.keypath"
    tag="p"
    class="text-xs text-center leading-5 opacity-70"
  >
    <template #terms>
      <ULink
        class="underline"
        raw
        :href="getDocsArticleURL('terms', locale)"
        target="_blank"
        rel="noopener noreferrer"
      >{{ $t('plus_terms_notice_terms_link') }}</ULink>
    </template>
    <template #refundPolicy>
      <ULink
        class="underline"
        raw
        :href="getDocsArticleURL('shippingReturnRefund', locale)"
        target="_blank"
        rel="noopener noreferrer"
      >{{ $t('plus_terms_notice_refund_policy_link') }}</ULink>
    </template>
  </i18n-t>
</template>

<script setup lang="ts">
const props = defineProps<{
  keypath: 'plus_terms_notice_subscribe' | 'plus_terms_notice_subscribed'
}>()

const { locale } = useI18n()
</script>
