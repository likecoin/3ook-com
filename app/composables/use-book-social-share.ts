interface BookSocialShareOptions {
  nftClassId: Ref<string>
  bookName: Ref<string>
  authorName: Ref<string>
  canonicalURL: Ref<string>
  from: Ref<string | undefined>
  selectedPricingItemIndex: Ref<number>
}

// Social share buttons for a book product page.
export function useBookSocialShare(options: BookSocialShareOptions) {
  const {
    nftClassId,
    bookName,
    authorName,
    canonicalURL,
    from,
    selectedPricingItemIndex,
  } = options

  const { t: $t } = useI18n()
  const toast = useToast()
  const { copy: copyToClipboard } = useClipboard()

  const socialButtons = computed(() => [
    { key: 'copy-links', label: $t('share_button_hint_copy_link'), icon: 'i-material-symbols-link-rounded' },
    { key: 'threads', label: $t('share_button_hint_threads'), icon: 'i-simple-icons-threads' },
    { key: 'facebook', label: $t('share_button_hint_facebook'), icon: 'i-simple-icons-facebook' },
    { key: 'whatsapp', label: $t('share_button_hint_whatsapp'), icon: 'i-simple-icons-whatsapp' },
    { key: 'x', label: $t('share_button_hint_x'), icon: 'i-simple-icons-x' },
  ])

  function getShareURL(medium: string) {
    const baseURL = canonicalURL.value
    const url = new URL(baseURL)
    url.searchParams.set('utm_source', medium)
    url.searchParams.set('utm_medium', 'social')
    url.searchParams.set('utm_campaign', 'share')
    if (from.value) {
      url.searchParams.set('from', from.value)
    }
    return url.toString()
  }

  async function handleSocialButtonClick(key: string) {
    const shareText = authorName.value
      ? $t('product_page_share_text_with_author', { title: bookName.value, author: authorName.value })
      : $t('product_page_share_text', { title: bookName.value })

    useLogEvent('share', {
      method: key,
      item_id: `${nftClassId.value}-${selectedPricingItemIndex.value}`,
    })

    switch (key) {
      case 'copy-links':
        try {
          const shareUrl = getShareURL('copy-link')
          await copyToClipboard(shareUrl)
          toast.add({
            title: $t('copy_link_success'),
            duration: 3000,
            icon: 'i-material-symbols-link-rounded',
            color: 'success',
          })
        }
        catch (error) {
          console.error('Failed to copy link:', error)
          toast.add({
            title: $t('copy_link_failed'),
            icon: 'i-material-symbols-error-circle-rounded',
            duration: 3000,
            color: 'error',
          })
        }
        break
      case 'threads':
        {
          const shareUrl = getShareURL('threads')
          window.open(
            `https://threads.net/intent/post?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
            '_blank',
            'noopener,noreferrer',
          )
        }
        break
      case 'facebook':
        {
          const shareUrl = getShareURL('facebook')
          window.open(
            `https://m.facebook.com/sharer/sharer.php?display=page&u=${encodeURIComponent(shareUrl)}`,
            '_blank',
            'noopener,noreferrer',
          )
        }
        break
      case 'whatsapp':
        {
          const shareUrl = getShareURL('whatsapp')
          window.open(
            `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
            '_blank',
            'noopener,noreferrer',
          )
        }
        break
      case 'x':
        {
          const shareUrl = getShareURL('x')
          window.open(
            `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
            '_blank',
            'noopener,noreferrer',
          )
        }
        break
      default:
    }
  }

  return {
    socialButtons,
    handleSocialButtonClick,
  }
}
