export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'private, no-cache, no-store, must-revalidate')
  const ip = getRequestHeader(event, 'cf-connecting-ip')
    || getRequestIP(event, { xForwardedFor: true })
    || null
  return { ip }
})
