<script lang="ts" setup>
const localeRoute = useLocaleRoute()
await navigateTo(localeRoute({ name: 'shelf-walletAddress' }), { replace: true })
</script>
