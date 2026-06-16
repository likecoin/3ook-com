if (!Object.hasOwn) {
  Object.hasOwn = function (obj: Record<string | number | symbol, unknown>, prop: string | number | symbol): boolean {
    return Object.prototype.hasOwnProperty.call(obj, prop)
  }
}

// Resolve a relative index per the `at` spec: truncate toward zero, NaN to 0,
// negative counts from the end. Returns -1 when out of range.
function resolveRelativeIndex(length: number, index: number): number {
  const i = Math.trunc(Number(index)) || 0
  const resolved = i < 0 ? length + i : i
  return resolved >= 0 && resolved < length ? resolved : -1
}

if (!Array.prototype.at) {
  Object.defineProperty(Array.prototype, 'at', {
    value: function <T>(this: T[], index: number): T | undefined {
      const i = resolveRelativeIndex(this.length, index)
      return i < 0 ? undefined : this[i]
    },
    writable: true,
    configurable: true,
    enumerable: false,
  })
}

if (!String.prototype.at) {
  Object.defineProperty(String.prototype, 'at', {
    value: function (this: string, index: number): string | undefined {
      const i = resolveRelativeIndex(this.length, index)
      return i < 0 ? undefined : this[i]
    },
    writable: true,
    configurable: true,
    enumerable: false,
  })
}

if (!Promise.withResolvers) {
  Promise.withResolvers = function<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
}

export default defineNuxtPlugin(() => {})
