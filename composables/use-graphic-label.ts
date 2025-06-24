import StoreZhGraphic from '~/assets/images/nav/bookstore-zh.svg'
import ShelfZhGraphic from '~/assets/images/nav/bookshelf-zh.svg'

const graphicsMap = {
  'zh-Hant': {
    store: StoreZhGraphic,
    shelf: ShelfZhGraphic,
  },
} as const

export function useGraphicLabel() {
  const { locale } = useI18n()

  const getLabelGraphic = (key: string) => {
    const icons = graphicsMap[locale.value as keyof typeof graphicsMap]
    return icons?.[key] || null
  }

  return { getLabelGraphic }
}
