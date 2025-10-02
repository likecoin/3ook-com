<template>
  <aside
    class="relative flex items-center bg-theme-500 overflow-hidden bg-cover bg-center"
    :style="{ backgroundImage: `url(${bannerBgImgSrc})` }"
  >
    <!-- Desktop Banner -->
    <template v-if="!isLandscape">
      <!-- Desktop Banner - Table -->
      <div
        :class="[
          'absolute',
          'top-[50%]',
          'right-0',
          'left-0',
          'h-[90px]',
          'w-full',
          'bg-gradient-to-b',
          'from-white/90',
          'via-sky-200/70',
          'via-5%',
          'to-black/0',
          'pointer-events-none',
        ]"
      />
      <!-- Desktop Banner - Backdrop -->
      <div
        :class="[
          'absolute',
          'top-0',
          'bottom-[50%]',
          'right-0',
          'left-0',
          'bg-white',
          'pointer-events-none',
        ]"
      >
        <div class="relative w-full h-full">
          <svg
            v-gsap.from.fromInvisible="{ duration: 1.5 }"
            class="absolute bottom-0 right-0"
            width="1920"
            height="1080"
            viewBox="0 0 1920 1080"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <image
              v-gsap.from="backdropRotateGSAPState"
              x="86"
              y="-571"
              width="3025"
              height="3025"
              :href="backdropImgSrc"
            />
          </svg>
        </div>
      </div>
      <svg
        class="relative ml-auto"
        width="486"
        height="800"
        viewBox="0 0 486 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title v-text="$t('pricing_page_plus_block_trend_bundle_banner_alt')" />
        <defs>
          <radialGradient
            id="paint0_radial_8047_1307"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(164 265) rotate(90) scale(148)"
          >
            <stop
              offset="0.1"
              stop-color="white"
            />
            <stop
              offset="0.6"
              stop-color="#ACD9EB"
              stop-opacity="0.5"
            />
            <stop
              offset="1"
              stop-color="#ACD9EB"
              stop-opacity="0"
            />
          </radialGradient>
        </defs>
        <circle
          cx="164"
          cy="265"
          r="148"
          fill="url(#paint0_radial_8047_1307)"
        />
        <image
          v-gsap.from.fromInvisible="{ x: '-20%', delay: 0.3, ease: 'power3.out' }"
          :href="slogan1ImgSrc"
          width="220"
          height="142"
          x="78"
          y="30"
        />
        <image
          v-gsap.from.fromInvisible="{ x: '20%', delay: 0.6, ease: 'power3.out' }"
          :href="slogan2ImgSrc"
          width="220"
          height="142"
          x="188"
          y="78"
        />
        <image
          v-gsap.from.fromInvisible="{
            scale: 0.5,
            delay: 0.3,
            duration: 0.25,
            ease: 'power3.out',
            transformOrigin: 'center center',
          }"
          :href="blocktrendLogoImgSrc"
          width="60"
          height="98"
          x="134"
          y="209"
        />
        <image
          v-gsap.from.fromInvisible="{ x: '10%', delay: 0.5, duration: 0.5 }"
          :href="mnhsuImgSrc"
          width="349"
          height="349"
          x="137"
          y="144"
        />
        <image
          v-gsap.from.fromInvisible="{ x: '-10%', delay: 0.8 }"
          :href="description1ImgSrc"
          width="272"
          height="49"
          x="49"
          y="440"
        />
        <image
          v-gsap.from.fromInvisible="{
            x: '-10%',
            delay: 1,
            duration: 0.25,
            ease: 'bounce.out',
          }"
          :href="description2ImgSrc"
          width="264"
          height="79"
          x="76"
          y="473"
        />
        <image
          v-gsap.from.fromInvisible="{
            x: '10%',
            delay: 1,
            duration: 0.25,
            ease: 'bounce.out',
          }"
          :href="description3ImgSrc"
          width="125"
          height="49"
          x="326"
          y="497"
        />
        <g
          v-gsap.from.fromInvisible="{
            scale: 0,
            delay: 1,
            duration: 0.5,
            ease: 'bounce.out',
            transformOrigin: 'center',
          }"
        >
          <image
            v-gsap.from.infinitely="{
              scale: 1.02,
              transformOrigin: 'center',
              ease: 'power3.inOut',
            }"
            :href="badgeImgSrc"
            width="157"
            height="56"
            x="307"
            y="529"
          />
        </g>
        <image
          v-gsap.from.fromInvisible="{ y: '10%', delay: 1 }"
          :href="footnote1ImgSrc"
          width="209"
          height="29"
          x="139"
          y="597"
        />
        <image
          v-gsap.from.fromInvisible="{ y: '10%', delay: 1.2 }"
          :href="footnote2ImgSrc"
          width="188"
          height="29"
          x="149"
          y="626"
        />
        <image
          v-gsap.from.fromInvisible="{ y: '10%', delay: 1.4 }"
          :href="logoImgSrc"
          width="161"
          height="38"
          x="158"
          y="669"
        />
      </svg>
    </template>
    <template v-else>
      <!-- Mobile Banner -->
      <svg
        viewBox="0 0 568 320"
        fill="white"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title v-text="$t('pricing_page_plus_block_trend_bundle_banner_alt')" />
        <defs>
          <clipPath id="clip1_8053_221">
            <rect
              width="284"
              height="320"
              fill="white"
            />
          </clipPath>
        </defs>
        <rect
          width="284"
          height="320"
          fill="white"
        />
        <g
          v-gsap.from.fromInvisible="{ duration: 1.5 }"
          clip-path="url(#clip1_8053_221)"
        >
          <image
            v-gsap.from="backdropRotateGSAPState"
            :href="backdropImgSrc"
            x="-178"
            y="-125"
            width="640"
            height="640"
          />
        </g>
        <rect
          y="308"
          width="568"
          height="100"
          :fill="isDarkBackground ? '#131313' : 'white'"
        />
        <image
          :href="mnhsuImgSrc"
          width="349"
          height="349"
          x="105"
          y="53"
        />
        <image
          v-gsap.from.fromInvisible="{
            scale: 0.5,
            delay: 0.3,
            duration: 0.5,
            ease: 'bounce.out',
            transformOrigin: 'center center',
          }"
          :href="blocktrendLogoImgSrc"
          width="60"
          height="98"
          x="112"
          y="146"
        />
        <image
          v-gsap.from.fromInvisible="{ x: '-20%', delay: 0.3, duration: 0.3 }"
          :href="slogan1ImgSrc"
          width="158"
          height="102"
          x="23"
          y="13"
        />
        <image
          v-gsap.from.fromInvisible="{ x: '20%', delay: 0.6, duration: 0.3 }"
          :href="slogan2ImgSrc"
          width="159"
          height="102"
          x="102"
          y="47"
        />
        <image
          v-gsap.from.fromInvisible="{ y: '-10%', delay: 0.3 }"
          :href="description1ImgSrc"
          width="235"
          height="42"
          x="318"
          y="34"
        />
        <image
          v-gsap.from.fromInvisible="{
            scale: 0.75,
            delay: 0.5,
            ease: 'power3.out',
            transformOrigin: 'center',
          }"
          :href="description2ImgSrc"
          width="210"
          height="63"
          x="330"
          y="70"
        />
        <image
          v-gsap.from.fromInvisible="{
            scale: 0.75,
            delay: 0.5,
            ease: 'power3.out',
            transformOrigin: 'center',
          }"
          :href="description3ImgSrc"
          width="100"
          height="39"
          x="376"
          y="125"
        />
        <g
          v-gsap.from.fromInvisible="{
            scale: 0,
            delay: 0.5,
            duration: 0.5,
            ease: 'bounce.out',
            transformOrigin: 'center',
          }"
        >
          <image
            v-gsap.from.infinitely="{
              scale: 1.02,
              transformOrigin: 'center',
              ease: 'power3.inOut',
            }"
            :href="badgeImgSrc"
            width="125"
            height="46"
            x="369"
            y="156"
          />
        </g>
        <image
          v-gsap.from.fromInvisible="{ y: '20%', delay: 0.8 }"
          :href="footnote1ImgSrc"
          width="137"
          height="19"
          x="364"
          y="218"
        />
        <image
          v-gsap.from.fromInvisible="{ y: '20%', delay: 0.9 }"
          :href="footnote2ImgSrc"
          width="124"
          height="18"
          x="371"
          y="236"
        />
        <image
          v-gsap.from.fromInvisible="{ y: '20%', delay: 1 }"
          :href="logoImgSrc"
          width="81"
          height="19"
          x="386"
          y="270"
        />
      </svg>
    </template>
  </aside>
</template>

<script setup lang="ts">
import backdropImgSrc from '~/assets/images/paywall/plus-blocktrend-bundle-banner/backdrop.svg?inline'
import badgeImgSrc from '~/assets/images/paywall/plus-blocktrend-bundle-banner/badge.png'
import bannerBgImgSrc from '~/assets/images/paywall/bg-dark.jpg'
import blocktrendLogoImgSrc from '~/assets/images/paywall/plus-blocktrend-bundle-banner/logo-blocktrend.png'
import description1ImgSrc from '~/assets/images/paywall/plus-blocktrend-bundle-banner/description1.png'
import description2ImgSrc from '~/assets/images/paywall/plus-blocktrend-bundle-banner/description2.png'
import description3ImgSrc from '~/assets/images/paywall/plus-blocktrend-bundle-banner/description3.png'
import footnote1ImgSrc from '~/assets/images/paywall/plus-blocktrend-bundle-banner/footnote1.png'
import footnote2ImgSrc from '~/assets/images/paywall/plus-blocktrend-bundle-banner/footnote2.png'
import logoImgSrc from '~/assets/images/paywall/plus-blocktrend-bundle-banner/logo-3ookcom.png'
import mnhsuImgSrc from '~/assets/images/paywall/plus-blocktrend-bundle-banner/mnhsu.png'
import slogan1ImgSrc from '~/assets/images/paywall/plus-blocktrend-bundle-banner/slogan1.png'
import slogan2ImgSrc from '~/assets/images/paywall/plus-blocktrend-bundle-banner/slogan2.png'

const props = defineProps({
  isForceLandscape: {
    type: Boolean,
    default: false,
  },
  isDarkBackground: {
    type: Boolean,
    default: false,
  },
})

const isDesktopScreen = useDesktopScreen()

const isLandscape = computed(() => {
  return props.isForceLandscape || !isDesktopScreen.value
})

const backdropRotateGSAPState = {
  rotate: -360,
  transformOrigin: 'center',
  duration: 90,
  repeat: -1,
  ease: 'linear',
}
</script>
