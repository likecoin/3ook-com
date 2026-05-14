<template>
  <div class="flex flex-col min-h-svh pb-(--intercom-launcher-offset)">
    <div class="flex items-center justify-center grow p-5 laptop:p-12">
      <UCard
        :ui="{
          root: 'ring-theme-black ring-2',
          header: 'bg-theme-black',
        }"
      >
        <template #header>
          <AppLogo
            class="max-w-xs mx-auto"
            height="auto"
            :is-icon="false"
          />
        </template>
        <h1
          class="text-2xl font-bold text-center animate-pulse"
          v-text="$t('maintenance_page_title')"
        />
        <p
          class="mt-4"
          v-text="$t('maintenance_page_description')"
        />
      </UCard>
    </div>

    <AppFooter :is-show-logo="false" />
  </div>
</template>
