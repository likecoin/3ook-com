if (!Object.hasOwn) {
  Object.hasOwn = function (obj: Record<string | number | symbol, unknown>, prop: string | number | symbol): boolean {
    return Object.prototype.hasOwnProperty.call(obj, prop)
  }
}
