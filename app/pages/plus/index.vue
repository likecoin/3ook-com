<script setup lang="ts">
const route = useRoute()
const localeRoute = useLocaleRoute()
await navigateTo(localeRoute({ name: 'member', query: route.query }))
</script>
