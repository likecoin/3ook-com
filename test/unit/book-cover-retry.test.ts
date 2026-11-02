import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BookCover, {
  BOOK_COVER_MAX_RETRY_COUNT,
  BOOK_COVER_RETRY_DELAY_MS,
} from '~/components/BookCover.vue'

type Wrapper = Awaited<ReturnType<typeof mountSuspended>>

const COVER_URL = 'https://static.like.co/thumbnail/?url=cover.png&width=300'

function getCoverImage(wrapper: Wrapper) {
  return wrapper.find('img:not([aria-hidden])')
}

function isShowingErrorIcon(wrapper: Wrapper) {
  return wrapper.find('.iconify, [class*="i-material-symbols-book-2"]').classes().includes('opacity-100')
}

async function failAndWait(wrapper: Wrapper) {
  await getCoverImage(wrapper).trigger('error')
  vi.advanceTimersByTime(BOOK_COVER_RETRY_DELAY_MS)
  await nextTick()
}

describe('BookCover', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('retries a failed cover with a cache-busting query after a delay', async () => {
    const wrapper = await mountSuspended(BookCover, { props: { src: COVER_URL } })

    await getCoverImage(wrapper).trigger('error')
    vi.advanceTimersByTime(BOOK_COVER_RETRY_DELAY_MS - 1)
    await nextTick()
    expect(getCoverImage(wrapper).attributes('src')).toBe(COVER_URL)
    expect(isShowingErrorIcon(wrapper)).toBe(false)

    vi.advanceTimersByTime(1)
    await nextTick()
    const retryURL = new URL(getCoverImage(wrapper).attributes('src')!)
    expect(retryURL.searchParams.get('retry')).toBe('1')
    expect(retryURL.searchParams.get('url')).toBe('cover.png')
  })

  it('shows the placeholder icon once retries run out', async () => {
    const wrapper = await mountSuspended(BookCover, { props: { src: COVER_URL } })

    for (let i = 0; i < BOOK_COVER_MAX_RETRY_COUNT; i += 1) {
      await failAndWait(wrapper)
      expect(isShowingErrorIcon(wrapper)).toBe(false)
    }
    await failAndWait(wrapper)
    expect(isShowingErrorIcon(wrapper)).toBe(true)
    expect(new URL(getCoverImage(wrapper).attributes('src')!).searchParams.get('retry'))
      .toBe(String(BOOK_COVER_MAX_RETRY_COUNT))
  })

  it('shows the cover after a retry succeeds', async () => {
    const wrapper = await mountSuspended(BookCover, { props: { src: COVER_URL } })

    await failAndWait(wrapper)
    await getCoverImage(wrapper).trigger('load')
    expect(getCoverImage(wrapper).classes()).toContain('opacity-100')
  })

  it('does not retry non-HTTP sources', async () => {
    const src = 'data:image/png;base64,AAAA'
    const wrapper = await mountSuspended(BookCover, { props: { src } })

    await getCoverImage(wrapper).trigger('error')
    expect(isShowingErrorIcon(wrapper)).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('starts over with the original URL when src changes', async () => {
    const wrapper = await mountSuspended(BookCover, { props: { src: COVER_URL } })

    await failAndWait(wrapper)
    const nextURL = 'https://static.like.co/thumbnail/?url=next.png&width=300'
    await wrapper.setProps({ src: nextURL })
    expect(getCoverImage(wrapper).attributes('src')).toBe(nextURL)
  })
})
