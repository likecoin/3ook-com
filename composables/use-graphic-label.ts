import StoreZhIcon from '~/assets/images/bookstore-header-zh.svg'
import ShelfZhIcon from '~/assets/images/bookshelf-header-zh.svg'

const graphicsMap = {
  'zh-Hant': {
    store: StoreZhIcon,
    shelf: ShelfZhIcon,
  },
} as const

export function useGraphicLabel() {
  const { locale } = useI18n()

  const getLabelComponent = (key: string) => {
    return computed(() => {
      const icons = graphicsMap[locale.value as keyof typeof graphicsMap]
      return icons?.[key] || null
    }).value
  }

  return {
    getLabelComponent,
  }
}
