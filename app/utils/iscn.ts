export function extractPrefixFromISCNId(iscnId: string) {
  const [,iscnIdPrefix] = /^(iscn:\/\/likecoin-chain\/[A-Za-z0-9-_]+)(?:\/([0-9]*))?$/.exec(iscnId) || []
  return iscnIdPrefix
}
