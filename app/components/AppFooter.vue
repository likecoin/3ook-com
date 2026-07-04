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
        :title="$t('footer_about')"
      >
        <AppLogo
          v-if="props.isShowLogo"
          role="img"
          :aria-label="$t('footer_about')"
        />
      </ULink>
      <div class="flex items-center gap-2 leading-5">
        <ULink
          class="border-b"
          to="https://github.com/likecoin/3ook-com?tab=GPL-3.0-1-ov-file#readme"
          target="_blank"
          rel="noopener noreferrer"
        >{{ $t('footer_license') }}</ULink>
        <span>·</span>
        <span v-text="COMPANY_LEGAL_NAME" />
      </div>
      <nav>
        <ul class="flex justify-center items-center flex-wrap gap-4 gap-y-1">
          <li v-if="!isApp">
            <ULink
              class="block border-y border-t-transparent leading-5"
              :to="localeRoute({ name: 'app' })"
              @click="handleAppLinkClick"
            >{{ $t("footer_app") }}</ULink>
          </li>
          <li>
            <ULink
              class="block border-y border-t-transparent leading-5"
              :href="privacyURL"
              target="_blank"
              rel="noopener noreferrer"
            >{{ $t("footer_privacy") }}</ULink>
          </li>
          <li>
            <ULink
              class="block border-y border-t-transparent leading-5"
              :href="termsURL"
              target="_blank"
              rel="noopener noreferrer"
            >{{ $t("footer_terms") }}</ULink>
          </li>
          <li>
            <ULink
              class="block border-y border-t-transparent leading-5"
              :href="shippingReturnRefundURL"
              target="_blank"
              rel="noopener noreferrer"
            >{{ $t("footer_shipping_return") }}</ULink>
          </li>
          <li>
            <ULink
              class="block border-y border-t-transparent leading-5"
              :to="localeRoute({ name: 'contact' })"
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
            :aria-label="$t('footer_social_instagram')"
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
            :aria-label="$t('footer_social_facebook')"
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
            :aria-label="$t('footer_social_threads')"
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
            :aria-label="$t('footer_social_review')"
            href="https://review.3ook.com"
          />
        </li>
      </ul>
    </div>

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
const { t: $t, locale } = useI18n()
const localeRoute = useLocaleRoute()
const { isApp, buildVersion } = useAppDetection()

const privacyURL = computed(() => getDocsArticleURL('privacy', locale.value))
const termsURL = computed(() => getDocsArticleURL('terms', locale.value))
const shippingReturnRefundURL = computed(() => getDocsArticleURL('shippingReturnRefund', locale.value))

function handleAppLinkClick() {
  useLogEvent('footer_app_link_click')
}
</script>
