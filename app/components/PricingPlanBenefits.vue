<template>
  <div
    :class="[
      'flex',
      'flex-col',
      isTitleCenter ? 'items-center' : 'items-start',
      'gap-3 laptop:gap-4',
    ]"
  >
    <div
      v-if="!isTitleHidden"
      :class="[
        isDarkBackground ? 'text-theme-cyan' : 'text-theme-black dark:text-theme-cyan',
        isTitleCenter ? 'text-center' : 'text-left',
        'font-bold',
        'border-b-2 border-current',
      ]"
      v-text="title || $t('pricing_page_subscription')"
    />

    <ul
      :class="[
        '*:flex *:items-start',
        'space-y-3 laptop:space-y-4',
        'text-left',
        'whitespace-pre-wrap',
        '[&>li>span:first-child]:shrink-0',
        '[&>li>span:first-child]:mt-1',
        '[&>li>span:first-child]:mr-2',
        '[&>li>span:first-child]:text-theme-cyan',
        { '[&>li>span:last-child]:text-white': isDarkBackground },
      ]"
    >
      <li
        v-for="(feature, index) in prependedFeatures"
        :key="`prepended-${index}`"
      >
        <UIcon name="i-material-symbols-check" />
        <span v-text="feature" />
      </li>
      <li>
        <UIcon name="i-material-symbols-check" />
        <i18n-t
          keypath="pricing_page_feature_library"
          tag="span"
        >
          <template #library>
            <NuxtLink
              :to="localeRoute({ name: 'library' })"
              class="underline"
              @click="handleClickLibrary"
            >
              {{ $t('pricing_page_feature_library_link') }}
            </NuxtLink>
          </template>
        </i18n-t>
      </li>
      <li v-if="!isAudioHidden">
        <UIcon name="i-material-symbols-check" />
        <span v-text="$t('pricing_page_feature_1')" />
      </li>
      <li>
        <UIcon name="i-material-symbols-check" />
        <span v-text="$t('pricing_page_feature_2')" />
      </li>
      <template v-if="!isCompact">
        <li>
          <UIcon name="i-material-symbols-check" />
          <span v-text="$t('pricing_page_feature_3')" />
        </li>
        <li>
          <UIcon name="i-material-symbols-check" />
          <i18n-t
            keypath="pricing_page_feature_4"
            tag="span"
          >
            <template #customerService>
              <button
                type="button"
                class="underline cursor-pointer"
                @click="handleOpenIntercom"
                v-text="$t('pricing_page_feature_4_customer_service')"
              />
            </template>
          </i18n-t>
        </li>
      </template>
    </ul>
  </div>
</template>

<script lang="ts" setup>
withDefaults(defineProps<{
  title?: string
  isTitleCenter?: boolean
  isTitleHidden?: boolean
  isDarkBackground?: boolean
  isCompact?: boolean
  isAudioHidden?: boolean
  prependedFeatures?: string[]
}>(), {
  isTitleCenter: false,
  isTitleHidden: false,
  isDarkBackground: false,
  isCompact: false,
  isAudioHidden: false,
  prependedFeatures: () => [],
})

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const intercom = useIntercom()

function handleClickLibrary() {
  useLogEvent('pricing_benefit_click_library')
}

function handleOpenIntercom() {
  useLogEvent('pricing_benefit_click_intercom')
  intercom.showNewMessage($t('pricing_page_intercom_prefill'))
}
</script>
