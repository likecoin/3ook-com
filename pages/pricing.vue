<script setup>
const route = useRoute()
const localeRoute = useLocaleRoute()

await navigateTo(localeRoute({ name: 'member', query: route.query }), {
  redirectCode: 301,
  external: false,
})
</script>
