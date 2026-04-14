<template>
  <UModal
    v-model:open="isOpen"
    :dismissible="!isBusy"
  >
    <UButton
      :label="$t('uploaded_book_upload_button')"
      icon="i-material-symbols-upload-rounded"
      v-bind="$attrs"
    />

    <template #content>
      <UCard :ui="{ header: 'font-bold' }">
        <template #header>
          {{ $t('uploaded_book_upload_title') }}
        </template>

        <div class="flex flex-col gap-4">
          <div>
            <p class="text-sm text-muted">
              {{ $t('uploaded_book_upload_description') }}
            </p>
            <p class="text-xs text-toned mt-1">
              {{ $t('uploaded_book_quota_label', { count: quota.count, max: quota.maxCount }) }}
            </p>
          </div>

          <div
            v-if="!selectedFile"
            class="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-8 cursor-pointer hover:border-primary transition-colors"
            @click="openFilePicker"
            @dragover.prevent
            @drop.prevent="handleDrop"
          >
            <UIcon
              name="i-material-symbols-upload-file-outline"
              size="48"
              class="text-muted"
            />
            <span class="text-sm text-muted">{{ $t('uploaded_book_drop_or_click') }}</span>
            <span class="text-xs text-dimmed">EPUB, PDF ({{ $t('uploaded_book_max_size', { size: '100MB' }) }})</span>
          </div>

          <div
            v-else
            class="flex items-center gap-3 p-3 border rounded-lg"
          >
            <UIcon
              :name="selectedFile.type === 'application/pdf' ? 'i-material-symbols-picture-as-pdf' : 'i-material-symbols-book-5-outline'"
              size="24"
            />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">
                {{ selectedFile.name }}
              </div>
              <div class="text-xs text-muted">
                {{ formatFileSize(selectedFile.size) }}
              </div>
            </div>
            <UButton
              icon="i-material-symbols-close"
              variant="ghost"
              color="neutral"
              size="xs"
              :disabled="isBusy"
              @click="clearFile"
            />
          </div>

          <div
            v-if="isParsing"
            class="text-xs text-toned"
          >
            {{ $t('uploaded_book_parsing') }}
          </div>

          <template v-if="selectedFile">
            <UFormField
              :label="$t('uploaded_book_name_label')"
              required
            >
              <UInput
                v-model="bookName"
                class="w-full"
                :placeholder="$t('uploaded_book_name_placeholder')"
                :maxlength="200"
                :disabled="isBusy"
              />
            </UFormField>

            <UFormField :label="$t('uploaded_book_cover_label')">
              <div class="relative inline-block">
                <button
                  type="button"
                  class="flex items-center justify-center w-24 h-32 rounded-md overflow-hidden bg-theme-black/5 dark:bg-theme-white/5 border border-dashed hover:border-primary hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  :aria-label="coverBlob ? $t('uploaded_book_cover_change') : undefined"
                  :disabled="isBusy"
                  @click="openCoverPicker"
                >
                  <img
                    v-if="coverPreviewUrl"
                    :src="coverPreviewUrl"
                    class="w-full h-full object-cover"
                    alt=""
                  >
                  <div
                    v-else
                    class="flex flex-col items-center gap-1 text-dimmed px-2 text-center"
                  >
                    <UIcon
                      name="i-material-symbols-image-outline"
                      size="28"
                    />
                    <span class="text-xs">{{ $t('uploaded_book_cover_select') }}</span>
                  </div>
                </button>
                <UButton
                  v-if="coverBlob"
                  icon="i-material-symbols-close"
                  size="xs"
                  color="neutral"
                  variant="solid"
                  class="absolute -top-2 -right-2 rounded-full shadow"
                  :aria-label="$t('uploaded_book_cover_remove')"
                  :disabled="isBusy"
                  @click.stop="clearCover"
                />
              </div>
            </UFormField>
          </template>

          <div
            v-if="errorMessage"
            class="text-sm text-red-500"
          >
            {{ errorMessage }}
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              :label="$t('common_cancel')"
              variant="ghost"
              color="neutral"
              :disabled="isBusy"
              @click="isOpen = false"
            />
            <UButton
              :label="$t('uploaded_book_upload_confirm')"
              :loading="isUploading"
              :disabled="!canSubmit"
              @click="handleUpload"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>

  <input
    ref="fileInputRef"
    type="file"
    class="hidden"
    accept=".epub,.pdf,application/epub+zip,application/pdf"
    @change="handleFileSelect"
  >

  <input
    ref="coverInputRef"
    type="file"
    class="hidden"
    :accept="UPLOADED_BOOK_COVER_PICKER_TYPES.join(',')"
    @change="handleCoverSelect"
  >
</template>

<script setup lang="ts">
import {
  UPLOADED_BOOK_ALLOWED_TYPES,
  UPLOADED_BOOK_COVER_MAX_DIMENSION,
  UPLOADED_BOOK_COVER_PICKER_TYPES,
  UPLOADED_BOOK_MAX_FILE_SIZE,
} from '~/shared/utils/uploaded-book'

defineOptions({ inheritAttrs: false })
const emit = defineEmits(['uploaded'])

const { t: $t } = useI18n()
const uploadedBooksStore = useUploadedBooksStore()
const toast = useToast()

const isOpen = ref(false)
const selectedFile = ref<File | null>(null)
const bookName = ref('')
const coverBlob = ref<Blob | null>(null)
const isParsing = ref(false)
const isUploading = ref(false)
const errorMessage = ref('')
const fileInputRef = ref<HTMLInputElement>()
const coverInputRef = ref<HTMLInputElement>()

const isBusy = computed(() => isParsing.value || isUploading.value)
const quota = computed(() => uploadedBooksStore.quota)
const coverPreviewUrl = useObjectUrl(coverBlob)
const canSubmit = computed(() =>
  !!selectedFile.value
  && !!bookName.value.trim()
  && !isBusy.value
  && quota.value.count < quota.value.maxCount,
)

function openFilePicker() {
  fileInputRef.value?.click()
}

function openCoverPicker() {
  coverInputRef.value?.click()
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) setFile(file)
  target.value = ''
}

function handleDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0]
  if (file) setFile(file)
}

async function setFile(file: File) {
  errorMessage.value = ''
  if (!UPLOADED_BOOK_ALLOWED_TYPES.includes(file.type)) {
    errorMessage.value = $t('uploaded_book_error_invalid_format')
    return
  }
  if (file.size > UPLOADED_BOOK_MAX_FILE_SIZE) {
    errorMessage.value = $t('uploaded_book_error_too_large')
    return
  }
  selectedFile.value = file
  // Pre-fill from filename so the field isn't blank if parsing is slow.
  if (!bookName.value) {
    bookName.value = file.name.replace(/\.(epub|pdf)$/i, '')
  }
  coverBlob.value = null

  isParsing.value = true
  try {
    const parsed = await parseBookMetadata(file)
    if (parsed.title) bookName.value = parsed.title
    if (parsed.cover) coverBlob.value = parsed.cover.blob
  }
  catch (error: unknown) {
    selectedFile.value = null
    bookName.value = ''
    const message = getErrorMessage(error)
    if (message === 'INVALID_EPUB') {
      errorMessage.value = $t('uploaded_book_error_invalid_epub')
    }
    else if (message === 'INVALID_PDF') {
      errorMessage.value = $t('uploaded_book_error_invalid_pdf')
    }
    else {
      errorMessage.value = $t('uploaded_book_error_invalid_format')
    }
  }
  finally {
    isParsing.value = false
  }
}

async function handleCoverSelect(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return
  if (!UPLOADED_BOOK_COVER_PICKER_TYPES.includes(file.type)) {
    errorMessage.value = $t('uploaded_book_error_invalid_cover')
    return
  }
  try {
    const resized = await resizeImageBlob(file, UPLOADED_BOOK_COVER_MAX_DIMENSION)
    coverBlob.value = resized
    errorMessage.value = ''
  }
  catch {
    errorMessage.value = $t('uploaded_book_error_invalid_cover')
  }
}

function clearFile() {
  selectedFile.value = null
  bookName.value = ''
  coverBlob.value = null
  errorMessage.value = ''
}

function clearCover() {
  coverBlob.value = null
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function handleUpload() {
  if (!selectedFile.value) return
  const trimmedName = bookName.value.trim()
  if (!trimmedName) {
    errorMessage.value = $t('uploaded_book_error_name_required')
    return
  }
  errorMessage.value = ''
  isUploading.value = true

  try {
    await uploadedBooksStore.uploadBook(selectedFile.value, {
      name: trimmedName,
      cover: coverBlob.value || undefined,
    })
    toast.add({ title: $t('uploaded_book_upload_success') })
    isOpen.value = false
    clearFile()
    emit('uploaded')
  }
  catch (error: unknown) {
    const message = getErrorMessage(error)
    if (message === 'UPLOAD_QUOTA_EXCEEDED') {
      errorMessage.value = $t('uploaded_book_error_quota_exceeded')
    }
    else if (message === 'REQUIRE_LIKER_PLUS') {
      errorMessage.value = $t('uploaded_book_error_plus_required')
    }
    else {
      errorMessage.value = $t('uploaded_book_error_upload_failed')
    }
  }
  finally {
    isUploading.value = false
  }
}
</script>
