<template>
  <UModal
    :title="$t('plus_downgrade_confirm_title')"
    :description="$t('plus_downgrade_confirm_description')"
    :dismissible="!isDowngrading"
    :close="!isDowngrading"
    :ui="{
      body: 'flex flex-col gap-4',
      footer: 'flex justify-end gap-3',
    }"
  >
    <template #body>
      <div
        v-if="affectedMembers.length"
        class="flex flex-col gap-2"
      >
        <div
          class="text-sm font-semibold"
          v-text="$t('plus_downgrade_members_warning', { count: affectedMembers.length })"
        />
        <ul class="flex flex-col gap-1">
          <li
            v-for="member in affectedMembers"
            :key="member.inviteId"
            class="text-sm text-muted truncate"
            v-text="member.name ? `${member.name} (${member.email})` : member.email"
          />
        </ul>
      </div>

      <div
        class="text-sm text-muted"
        v-text="$t('plus_downgrade_period_note')"
      />
    </template>

    <template #footer>
      <UButton
        :label="$t('common_cancel')"
        variant="outline"
        color="neutral"
        :disabled="isDowngrading"
        @click="emit('close', false)"
      />
      <UButton
        :label="$t('plus_downgrade_submit_button')"
        color="error"
        :loading="isDowngrading || isLoadingMembers"
        :disabled="isLoadingMembers"
        @click="handleConfirm"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
const emit = defineEmits<{ close: [isDowngraded: boolean] }>()

const { t: $t } = useI18n()

const {
  affectedMembers,
  isDowngrading,
  isLoadingMembers,
  loadAffectedMembers,
  handleDowngrade,
} = usePlusDowngrade()

onMounted(loadAffectedMembers)

async function handleConfirm() {
  const isDowngraded = await handleDowngrade()
  if (isDowngraded) emit('close', true)
}
</script>
