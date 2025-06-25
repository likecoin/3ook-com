<script setup lang="ts">
const route = useRoute()
const localeRoute = useLocaleRoute()
const classId = computed(() => getRouteParam('classId'))
await navigateTo(localeRoute({
  name: 'store-classId',
  params: { classId: classId.value },
  query: route.query,
}))
</script>
