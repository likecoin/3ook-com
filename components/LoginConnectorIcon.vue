<template>
  <img
    v-if="src"
    :src="src"
  >
  <span v-else />
</template>

<script setup lang="ts">
import cosmostation from '~/assets/images/login-connectors/cosmostation.svg'
import keplr from '~/assets/images/login-connectors/keplr.svg'
import metamask from '~/assets/images/login-connectors/metamask.svg'
import rabby from '~/assets/images/login-connectors/rabby.svg'

const props = defineProps<{
  connectorId: string
}>()

const src = computed(() => {
  switch (props.connectorId) {
    case 'io.cosmostation':
      return cosmostation
    case 'app.keplr':
      return keplr
    case 'metaMaskSDK':
      return metamask
    case 'io.rabby':
      return rabby
    default:
      return ''
  }
})
</script>
