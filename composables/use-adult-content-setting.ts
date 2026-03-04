export function useAdultContentSetting() {
  const { isApp } = useAppDetection()
  const setting = useSyncedUserSettings<boolean>({
    key: 'isAdultContentEnabled',
    defaultValue: false,
  })
  return computed({
    get: () => isApp.value ? false : setting.value,
    set: (value) => { if (!isApp.value) setting.value = value },
  })
}
