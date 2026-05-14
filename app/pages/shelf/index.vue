<script lang="ts" setup>
const route = useRoute()
const localeRoute = useLocaleRoute()
const target = localeRoute({ name: 'shelf-walletAddress', query: route.query })
// SSR needs an awaited navigateTo to emit a 302. On the client we
// fire-and-forget: awaiting in <script setup> would suspend this page
// if the target route stalls (e.g. offline).
if (import.meta.server) {
  await navigateTo(target, { replace: true })
}
else {
  navigateTo(target, { replace: true })
}
</script>
