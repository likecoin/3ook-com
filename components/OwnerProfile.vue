<template>
  <section class="flex flex-col items-center w-full">
    <div class="flex flex-col items-start w-full my-6">
      <div class="flex justify-start items-center laptop:items-start gap-4 w-full mb-4 laptop:mb-8">
        <UAvatar
          :src="ownerInfo.avatar"
          :alt="ownerInfo.displayName"
          icon="i-material-symbols-person-2-rounded"
          size="3xl"
        />
        <div class="w-full">
          <h1
            v-if="ownerInfo.displayName"
            class="font-semibold text-highlighted text-xl"
            v-text="ownerInfo.displayName"
          />
          <p
            v-if="ownerInfo.description"
            :class="ownerDescriptionClasses.desktop"
            v-text="ownerInfo.description"
          />
        </div>
      </div>

      <p
        v-if="ownerInfo.description"
        :class="ownerDescriptionClasses.mobile"
        v-text="ownerInfo.description"
      />
    </div>

    <div class="w-full">
      <div
        v-if="isEmpty"
        class="flex flex-col items-center justify-center m-auto py-16"
      >
        <UIcon
          class="opacity-20 mb-4"
          name="i-material-symbols-menu-book-outline-rounded"
          size="128"
        />
        <span class="font-bold opacity-20 text-lg">
          {{ $t('store_no_items') }}
        </span>
      </div>
      <ul
        v-else
        :class="[...gridClasses, 'w-full']"
      >
        <BookstoreItem
          v-for="(item, index) in ownedItems"
          :id="item.classId"
          :key="item.classId"
          :class="getGridItemClassesByIndex(index)"
          :nft-class-id="item.classId.toLowerCase()"
          :book-name="item.title"
        />
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
interface Props {
  authorWalletAddress: string
}

interface OwnerInfo {
  displayName: string
  description: string
  avatar: string
}

interface OwnedItem {
  classId: string
  title: string
}

const props = defineProps<Props>()

const metadataStore = useMetadataStore()
const ownedItemStore = useOwnedItemStore()

const classOwner = computed(() => {
  return metadataStore.getLikerInfoByWalletAddress(props.authorWalletAddress)
})

const ownerInfo = computed<OwnerInfo>(() => ({
  displayName: classOwner.value?.displayName || classOwner.value?.evmWallet || '',
  description: classOwner.value?.description || '',
  avatar: classOwner.value?.avatarSrc || '',
}))

const ownedItems = computed<OwnedItem[]>(() => {
  return ownedItemStore.getOwnedItems(props.authorWalletAddress) || []
})

const isEmpty = computed(() => ownedItems.value.length === 0)

const ownerDescriptionClasses = computed(() => ({
  desktop: [
    'hidden',
    'laptop:block',
    ownerInfo.value.displayName ? 'text-muted' : 'text-highlighted',
    'text-base',
    'font-mono',
    'break-words',
  ],
  mobile: [
    'laptop:hidden',
    ownerInfo.value.displayName ? 'text-muted' : 'text-highlighted',
    'text-base',
    'font-mono',
    'break-words',
  ],
}))

const { gridClasses, getGridItemClassesByIndex } = usePaginatedGrid({
  itemsCount: computed(() => ownedItems.value.length),
})
</script>
