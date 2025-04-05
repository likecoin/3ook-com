export const useISCNStore = defineStore('iscn', () => {
  const iscnRecordDataByIdPrefixMap = ref<Record<string, ISCNData>>({})

  const getISCNRecordDataByIdPrefix = computed(() => (iscnIdPrefix: string) => {
    return iscnRecordDataByIdPrefixMap.value[iscnIdPrefix]
  })

  function addISCNRecordDataByIdPrefix(iscnIdPrefix: string, data: ISCNData) {
    iscnRecordDataByIdPrefixMap.value[iscnIdPrefix] = data
  }

  function addISCNRecordData(data: ISCNData) {
    const iscnIdPrefix = extractPrefixFromISCNId(data['@id'])
    if (!iscnIdPrefix) return
    addISCNRecordDataByIdPrefix(iscnIdPrefix, data)
  }

  async function fetchISCNRecordDataByIdPrefix(iscnIdPrefix: string) {
    const iscnRecords = await fetchLikeCoinChainISCNRecordsByIdPrefix(iscnIdPrefix)
    const { data } = iscnRecords.records[0]
    addISCNRecordDataByIdPrefix(iscnIdPrefix, data)
    return data
  }

  return {
    iscnRecordDataByIdPrefixMap,

    getISCNRecordDataByIdPrefix,

    fetchISCNRecordDataByIdPrefix,
    addISCNRecordDataByIdPrefix,
    addISCNRecordData,
  }
})
