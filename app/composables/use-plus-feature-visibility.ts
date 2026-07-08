// Whether Plus-gated sections should render: the user is already Plus, or
// this build can start a subscribe flow.
export function usePlusFeatureVisibility() {
  const { user } = useUserSession()
  const { canStartSubscribeFlow } = useNativeIAP()
  return computed(() => canStartSubscribeFlow.value || !!user.value?.isLikerPlus)
}
