<script setup lang="ts">
const route = useRoute()
const getRouteParam = useRouteParam()
const localeRoute = useLocaleRoute()
const nftClassId = computed(() => getRouteParam('nftClassId'))
await navigateTo(localeRoute({
  name: 'store-nftClassId',
  params: { nftClassId: nftClassId.value },
  query: route.query,
}))
</script>
