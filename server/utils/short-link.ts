export function createShortLinkRedirectHandler(target: 'store' | 'library') {
  return defineEventHandler(async (event) => {
    const segment = getRouterParam(event, 'code', { decode: true }) || ''
    const location = resolveShortLinkRedirect(segment, getQuery(event), target)
    // Invalid codes fall back to the listing page
    await sendRedirect(event, location || `/${target}`, 302)
  })
}
