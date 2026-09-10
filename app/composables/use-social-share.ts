export interface SocialShareButton {
  key: string
  label: string
  icon: string
}

// The button key is not the utm_source:
// `getUTMSourceCode` maps the singular 'copy-link' to a packed short-link byte,
// so collapsing the two drops copy-link shares onto the query-string fallback.
const UTM_SOURCE_BY_SHARE_KEY: Record<string, string> = {
  'copy-links': 'copy-link',
  'threads': 'threads',
  'facebook': 'facebook',
  'whatsapp': 'whatsapp',
  'x': 'x',
}

interface SocialShareOptions {
  // Receives the utm_source for the chosen target, not the button key.
  getShareURL: (utmSource: string) => string
  shareText: MaybeRefOrGetter<string>
  logEventItemId: MaybeRefOrGetter<string>
}

// The share targets themselves: the button list, the intent URLs,
// the clipboard branch and the GA4 event.
// What is being shared is the caller's business.
export function useSocialShare(options: SocialShareOptions) {
  const { getShareURL, shareText, logEventItemId } = options

  const { t: $t } = useI18n()
  const toast = useToast()

  const socialButtons = computed<SocialShareButton[]>(() => [
    { key: 'copy-links', label: $t('share_button_hint_copy_link'), icon: 'i-material-symbols-link-rounded' },
    { key: 'threads', label: $t('share_button_hint_threads'), icon: 'i-simple-icons-threads' },
    { key: 'facebook', label: $t('share_button_hint_facebook'), icon: 'i-simple-icons-facebook' },
    { key: 'whatsapp', label: $t('share_button_hint_whatsapp'), icon: 'i-simple-icons-whatsapp' },
    { key: 'x', label: $t('share_button_hint_x'), icon: 'i-simple-icons-x' },
  ])

  async function handleSocialButtonClick(key: string) {
    const text = toValue(shareText)
    const utmSource = UTM_SOURCE_BY_SHARE_KEY[key]
    if (!utmSource) return

    // Logs the button key, not the utm_source —
    // the GA4 `share.method` series has always been keyed that way.
    useLogEvent('share', {
      method: key,
      item_id: toValue(logEventItemId),
    })

    const shareURL = getShareURL(utmSource)

    switch (key) {
      case 'copy-links':
        {
          const isCopied = await copyTextToClipboard(shareURL)
          toast.add({
            title: $t(isCopied ? 'copy_link_success' : 'copy_link_failed'),
            duration: 3000,
            icon: isCopied ? 'i-material-symbols-link-rounded' : 'i-material-symbols-error-circle-rounded',
            color: isCopied ? 'success' : 'error',
          })
        }
        break
      case 'threads':
        window.open(
          `https://threads.net/intent/post?text=${encodeURIComponent(`${text} ${shareURL}`)}`,
          '_blank',
          'noopener,noreferrer',
        )
        break
      case 'facebook':
        window.open(
          `https://m.facebook.com/sharer/sharer.php?display=page&u=${encodeURIComponent(shareURL)}`,
          '_blank',
          'noopener,noreferrer',
        )
        break
      case 'whatsapp':
        window.open(
          `https://wa.me/?text=${encodeURIComponent(`${text} ${shareURL}`)}`,
          '_blank',
          'noopener,noreferrer',
        )
        break
      case 'x':
        window.open(
          `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareURL)}&text=${encodeURIComponent(text)}`,
          '_blank',
          'noopener,noreferrer',
        )
        break
      default:
    }
  }

  return {
    socialButtons,
    handleSocialButtonClick,
  }
}
