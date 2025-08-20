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
      'mb-safe',
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
        <AppLogo :height="16" />
      </ULink>
      <ULink
        class="border-b leading-5"
        to="https://github.com/likecoin/3ook-com?tab=GPL-3.0-1-ov-file#readme"
        target="_blank"
      >{{ $t('footer_license') }}</ULink>
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
              :to="localeRoute({ name: 'pricing' })"
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
  </footer>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()

function onClickContactUs(event: MouseEvent) {
  if (window?.Intercom) {
    window.Intercom('show')
    event.preventDefault()
  }
}
</script>
