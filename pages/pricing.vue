<script setup>
definePageMeta({
  name: 'pricing-redirect',
})

navigateTo('/member', {
  redirectCode: 301,
  external: false,
})
</script>
