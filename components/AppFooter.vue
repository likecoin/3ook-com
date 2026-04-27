<template>
  <footer
    :class="[
      'flex',
      'flex-col',
      'items-stretch',
      'justify-between',
      'gap-4',

      'w-full',
      'max-w-[1440px]',
      'mx-auto',
      'px-5',
      'pt-5',
      'py-10',

      'text-xs',
      'font-semibold',
    ]"
  >
    <div
      class="flex flex-col justify-center items-center flex-wrap gap-6 gap-y-4 leading-5"
    >
      <ULink
        class="flex justify-center"
        :to="localeRoute({ name: 'about' })"
      >
        <AppLogo v-if="props.isShowLogo" />
      </ULink>
      <div class="flex items-center gap-2 leading-5">
        <ULink
          class="border-b"
          to="https://github.com/likecoin/3ook-com?tab=GPL-3.0-1-ov-file#readme"
          target="_blank"
          rel="noopener noreferrer"
        >{{ $t('footer_license') }}</ULink>
        <span>·</span>
        <span>Liker Land, Inc.</span>
      </div>
      <nav>
        <ul class="flex justify-center items-center flex-wrap gap-4 gap-y-1">
          <li>
            <ULink
              class="block border-y border-t-transparent leading-5"
              :to="localeRoute({ name: 'about' })"
            >{{ $t("footer_about") }}</ULink>
          </li>
          <li>
            <ULink
              class="block border-y border-t-transparent leading-5"
              :to="localeRoute({ name: 'member' })"
            >{{ $t("footer_plus") }}</ULink>
          </li>
          <li>
            <ULink
              class="block border-y border-t-transparent leading-5"
              href="https://link.3ook.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >{{ $t("footer_privacy") }}</ULink>
          </li>
          <li>
            <ULink
              class="block border-y border-t-transparent leading-5"
              href="https://link.3ook.com/terms"
              target="_blank"
              rel="noopener noreferrer"
            >{{ $t("footer_terms") }}</ULink>
          </li>
          <li>
            <ULink
              class="block border-y border-t-transparent leading-5"
              href="https://link.3ook.com/shipping-return-refund"
              target="_blank"
              rel="noopener noreferrer"
            >{{ $t("footer_shipping_return") }}</ULink>
          </li>
          <li>
            <ULink
              class="block border-y border-t-transparent leading-5"
              href="mailto:cs@3ook.com"
              target="_blank"
              rel="noopener noreferrer"
              @click="onClickContactUs"
            >{{ $t("footer_contact_us") }}</ULink>
          </li>
        </ul>
      </nav>
    </div>

    <div class="flex justify-center gap-6">
      <ul
        class="flex justify-center flex-wrap items-center gap-1.5"
      >
        <li>
          <UButton
            color="neutral"
            variant="link"
            size="xs"
            target="_blank"
            icon="i-simple-icons-instagram"
            href="https://www.instagram.com/3ookcom"
          />
        </li>
        <li>
          <UButton
            color="neutral"
            variant="link"
            size="xs"
            target="_blank"
            icon="i-simple-icons-facebook"
            href="https://www.facebook.com/3ookcom"
          />
        </li>
        <li>
          <UButton
            color="neutral"
            variant="link"
            size="xs"
            target="_blank"
            icon="i-simple-icons-threads"
            href="https://www.threads.com/@3ookcom"
          />
        </li>
        <li>
          <UButton
            color="neutral"
            variant="link"
            size="xs"
            target="_blank"
            icon="i-simple-icons-substack"
            href="https://review.3ook.com"
          />
        </li>
      </ul>
    </div>

    <AppDownloadButtons
      v-if="!isApp"
      class="mx-auto"
      @click-app-store="onClickAppStoreButton"
      @click-google-play="onClickGooglePlayButton"
    />

    <div
      v-if="commitSHA || buildVersion !== undefined"
      :class="[
        'flex',
        'justify-center',
        'items-center',
        'self-center',
        'text-muted',
        'text-xs',
        'border-2',
        'border-accented',
        'divide-x-2',
        'divide-accented',
        'rounded-sm',
        '*:px-1',
        '*:py-0.5',
      ]"
    >
      <ULink
        v-if="commitSHA"
        class="font-mono"
        :href="`https://github.com/likecoin/3ook-com/commit/${commitSHA}`"
        target="_blank"
        rel="noopener noreferrer"
        :external="true"
      >
        {{ commitSHA }}
      </ULink>

      <i18n-t
        v-if="buildVersion !== undefined"
        keypath="build_version"
        tag="span"
      >
        <template #buildVersion>
          <span
            class="font-mono"
            v-text="buildVersion"
          />
        </template>
      </i18n-t>
    </div>
  </footer>
</template>

<script setup lang="ts">
const props = defineProps({
  isShowLogo: {
    type: Boolean,
    default: true,
  },
})

const { commitSHA } = useRuntimeConfig().public
const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const { isApp, buildVersion } = useAppDetection()

function onClickContactUs(event: MouseEvent) {
  if (window?.Intercom) {
    window.Intercom('show')
    event.preventDefault()
  }
}

function onClickAppStoreButton() {
  useLogEvent('footer_app_store_click')
}

function onClickGooglePlayButton() {
  useLogEvent('footer_google_play_click')
}
</script>
