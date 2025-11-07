<script setup>
const localeRoute = useLocaleRoute()

await navigateTo(localeRoute({ name: 'member' }), {
  redirectCode: 301,
  external: false,
})
</script>
