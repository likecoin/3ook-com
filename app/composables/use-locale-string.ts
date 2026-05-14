export function useLocaleString() {
  const { locale } = useI18n()
  return (property: Record<string, string> | string) => {
    if (typeof property === 'object') {
      switch (locale.value) {
        case 'zh-Hant':
          return property['zh']
        default:
          return property['en']
      }
    }
    return property
  }
}
