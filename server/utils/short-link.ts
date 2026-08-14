export function createShortLinkRedirectHandler(target: 'store' | 'library') {
  return defineEventHandler(async (event) => {
    const segment = getRouterParam(event, 'code', { decode: true }) || ''
    await sendRedirect(event, resolveShortLinkRedirect(segment, getQuery(event), target), 302)
  })
}
