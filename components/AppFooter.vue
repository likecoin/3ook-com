<template>
  <footer
    :class="[
      'flex',
      'max-sm:flex-col',
      'items-stretch',
      'justify-between',
      'gap-4',

      'w-full',
      'max-w-[1440px]',
      'mx-auto',
      'px-5 2xl:px-14',
      'pt-3',
      'py-10',

      'text-xs',
      'font-semibold',
    ]"
  >
    <div
      class="flex flex-col phone:flex-row justify-center items-center flex-wrap gap-6 gap-y-4 leading-5"
    >
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
              href="https://cs.3ook.com"
              target="_blank"
              rel="noopener noreferrer"
            >{{ $t("footer_contact_us") }}</ULink>
          </li>
        </ul>
      </nav>
    </div>

    <div class="flex justify-center lg:justify-end gap-6">
      <ul
        class="flex justify-center flex-wrap items-center gap-1.5"
      >
        <li>
          <UButton
            color="neutral"
            variant="link"
            size="xs"
            target="_blank"
            icon="i-simple-icons-facebook"
            href="https://www.facebook.com/Liker.Land"
          />
        </li>
        <li>
          <UButton
            color="neutral"
            variant="link"
            size="xs"
            target="_blank"
            icon="i-simple-icons-instagram"
            href="https://www.instagram.com/liker.land"
          />
        </li>
        <li>
          <UButton
            color="neutral"
            variant="link"
            size="xs"
            target="_blank"
            icon="i-simple-icons-x"
            href="https://twitter.com/likecoin"
          />
        </li>
        <li>
          <UButton
            color="neutral"
            variant="link"
            size="xs"
            target="_blank"
            icon="i-simple-icons-medium"
            href="https://blog.liker.land"
          />
        </li>
      </ul>

      <LocaleSwitcher class="max-laptop:hidden" />
    </div>
  </footer>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
</script>
