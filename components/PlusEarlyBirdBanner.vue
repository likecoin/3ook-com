<template>
  <aside
    class="relative flex items-center bg-theme-500 overflow-hidden bg-cover bg-center"
    :style="{ backgroundImage: `url(${plusEarlyBirdBannerBg})` }"
  >
    <!-- Desktop Banner -->
    <svg
      class="max-laptop:hidden ml-auto max-h-[70vh]"
      viewBox="0 0 606 504"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title v-text="$t('pricing_page_plus_early_bird_banner_alt')" />
      <image
        v-gsap.fromInvisible.from="{
          delay: 0.3,
          duration: 0.2,
          scale: 0.5,
          x: '-150%',
          transformOrigin: 'center center',
        }"
        width="221"
        height="71"
        x="187"
        y="0"
        :href="plusEarlyBirdBannerTextEarlyBird"
      />
      <image
        v-gsap.fromInvisible.from="{
          delay: 0.5,
          x: '-150%',
          y: '150%',
          ease: 'elastic.out(1,0.7)',
        }"
        width="424"
        height="404"
        x="0"
        y="71"
        :href="plusEarlyBirdBannerTextDiscountRate"
      />
      <image
        v-gsap.fromInvisible.from="{
          delay: 0.7,
          scale: 0.5,
          duration: 0.2,
          transformOrigin: 'center center',
        }"
        width="95"
        height="51"
        x="435"
        y="130"
        :href="plusEarlyBirdBannerTextDiscount"
      />
      <g
        v-gsap.fromInvisible.from="{
          delay: 0.7,
          scale: 1.5,
          duration: 1,
          transformOrigin: 'center center',
          ease: 'elastic.out(1,0.2)',
        }"
      >
        <image
          v-gsap.from="{
            opacity: 0.8,
            repeat: -1,
            yoyo: true,
          }"
          width="260"
          height="76"
          x="293.817"
          y="193"
          :href="plusEarlyBirdBannerTextFinalCall"
        />
      </g>
      <image
        v-gsap.fromInvisible.from="{
          delay: 0.9,
          x: '100%',
          duration: 0.2,
        }"
        width="171"
        height="29"
        x="360.817"
        y="262"
        :href="plusEarlyBirdBannerTextEndDate"
      />
      <image
        v-gsap.fromInvisible.from="{
          delay: 1.1,
          x: '-100%',
        }"
        width="240"
        height="25"
        x="160"
        y="372"
        :href="plusEarlyBirdBannerTextCalloutLine1"
      />
      <image
        v-gsap.fromInvisible.from="{
          delay: 1.3,
          x: '-100%',
        }"
        width="240"
        height="25"
        x="160"
        y="406"
        :href="plusEarlyBirdBannerTextCalloutLine2"
      />
      <g
        v-gsap.fromInvisible.from="{
          delay: 1.3,
          scale: 2,
          duration: 1,
          transformOrigin: 'center center',
          ease: 'elastic.out(1,0.3)',
        }"
      >
        <image
          v-gsap.from="{
            y: -3,
            duration: 0.8,
            transformOrigin: 'center center',
            repeat: -1,
            yoyo: true,
          }"
          width="209"
          height="209"
          x="382"
          y="294"
          :href="plusEarlyBirdBannerGiftBox"
        />
      </g>
    </svg>

    <!-- Mobile Banner -->
    <svg
      class="laptop:hidden mx-auto"
      viewBox="0 0 568 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title v-text="$t('pricing_page_plus_early_bird_banner_alt')" />
      <image
        v-gsap.fromInvisible.from="{
          delay: 0.3,
          scale: 0.5,
          transformOrigin: 'center center',
        }"
        width="177"
        height="57"
        x="41"
        y="46"
        :href="plusEarlyBirdBannerTextEarlyBird"
      />
      <image
        v-gsap.fromInvisible.from="{
          delay: 0.5,
          x: '-100%',
          y: '100%',
          ease: 'elastic.out(1,0.5)',
        }"
        width="340"
        height="324"
        x="-121"
        y="102"
        :href="plusEarlyBirdBannerTextDiscountRate"
      />
      <image
        v-gsap.fromInvisible.from="{
          delay: 0.7,
          scale: 0.5,
          duration: 0.2,
          transformOrigin: 'center center',
        }"
        width="68"
        height="37"
        x="228"
        y="154"
        :href="plusEarlyBirdBannerTextDiscount"
      />
      <g
        v-gsap.fromInvisible.from="{
          delay: 0.7,
          scale: 1.5,
          duration: 0.5,
          transformOrigin: 'center center',
          ease: 'elastic.out(1,0.2)',
        }"
      >
        <image
          v-gsap.from="{
            opacity: 0.8,
            repeat: -1,
            yoyo: true,
          }"
          width="208"
          height="61"
          x="99"
          y="201"
          :href="plusEarlyBirdBannerTextFinalCall"
        />
      </g>
      <image
        v-gsap.fromInvisible.from="{
          delay: 0.9,
          x: '-100%',
          duration: 0.2,
        }"
        width="137"
        height="23"
        x="158"
        y="257"
        :href="plusEarlyBirdBannerTextEndDate"
      />
      <image
        v-gsap.fromInvisible.from="{
          delay: 1.1,
          x: '100%',
        }"
        width="198"
        height="21"
        x="334"
        y="78"
        :href="plusEarlyBirdBannerTextCalloutLine1"
      />
      <image
        v-gsap.fromInvisible.from="{
          delay: 1.3,
          x: '100%',
        }"
        width="198"
        height="24"
        x="334"
        y="106"
        :href="plusEarlyBirdBannerTextCalloutLine2"
      />
      <g
        v-gsap.fromInvisible.from="{
          delay: 1.3,
          scale: 2,
          duration: 1,
          transformOrigin: 'center center',
          ease: 'elastic.out(1,0.3)',
        }"
      >
        <image
          v-gsap.from="{
            y: -3,
            duration: 0.8,
            transformOrigin: 'center center',
            repeat: -1,
            yoyo: true,
          }"
          width="192"
          height="192"
          x="379"
          y="120"
          :href="plusEarlyBirdBannerGiftBox"
        />
      </g>
    </svg>

    <!-- Noise overlay -->
    <div
      class="absolute inset-0 bg-repeat bg-size-[20px_20px] opacity-50 pointer-events-none"
      :style="{ backgroundImage: `url(${plusEarlyBirdBannerNoise})` }"
    />
  </aside>
</template>

<script setup lang="ts">
import plusEarlyBirdBannerBg from '~/assets/images/paywall/plus-early-bird-banner/bg.jpg'
import plusEarlyBirdBannerNoise from '~/assets/images/paywall/plus-early-bird-banner/noise.png'
import plusEarlyBirdBannerTextCalloutLine1 from '~/assets/images/paywall/plus-early-bird-banner/text-callout-line-1.png'
import plusEarlyBirdBannerTextCalloutLine2 from '~/assets/images/paywall/plus-early-bird-banner/text-callout-line-2.png'
import plusEarlyBirdBannerTextDiscountRate from '~/assets/images/paywall/plus-early-bird-banner/text-discount-rate.png'
import plusEarlyBirdBannerTextDiscount from '~/assets/images/paywall/plus-early-bird-banner/text-discount.png'
import plusEarlyBirdBannerTextEarlyBird from '~/assets/images/paywall/plus-early-bird-banner/text-early-bird.png'
import plusEarlyBirdBannerTextEndDate from '~/assets/images/paywall/plus-early-bird-banner/text-end-date.png'
import plusEarlyBirdBannerTextFinalCall from '~/assets/images/paywall/plus-early-bird-banner/text-final-call.png'
import plusEarlyBirdBannerGiftBox from '~/assets/images/paywall/plus-early-bird-banner/gift-box.png'
</script>
