import type { TTSCantoneseModel } from '~/shared/types/user-settings'

export function useTTSCantoneseModel() {
  return useSyncedUserSettings<TTSCantoneseModel | undefined>({
    key: 'ttsCantoneseModel',
    defaultValue: '2.8',
  })
}
