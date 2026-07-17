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

// Array.prototype.findLast / findLastIndex (Chromium <97). Used at runtime by
// @nuxt/ui and @vueuse, so a missing native crashes any page on old WebViews.
// Impls are exported (named) so unit tests exercise them without mutating the
// shared global prototypes the test runner itself depends on.
type FindPredicate<T> = (value: T, index: number, array: T[]) => unknown

export function findLast<T>(array: T[], predicate: FindPredicate<T>, thisArg?: unknown): T | undefined {
  for (let i = array.length - 1; i >= 0; i--) {
    if (predicate.call(thisArg, array[i]!, i, array)) return array[i]
  }
  return undefined
}

export function findLastIndex<T>(array: T[], predicate: FindPredicate<T>, thisArg?: unknown): number {
  for (let i = array.length - 1; i >= 0; i--) {
    if (predicate.call(thisArg, array[i]!, i, array)) return i
  }
  return -1
}

if (!Array.prototype.findLast) {
  Object.defineProperty(Array.prototype, 'findLast', {
    value: function <T>(this: T[], predicate: FindPredicate<T>, thisArg?: unknown): T | undefined {
      return findLast(this, predicate, thisArg)
    },
    writable: true,
    configurable: true,
    enumerable: false,
  })
}

if (!Array.prototype.findLastIndex) {
  Object.defineProperty(Array.prototype, 'findLastIndex', {
    value: function <T>(this: T[], predicate: FindPredicate<T>, thisArg?: unknown): number {
      return findLastIndex(this, predicate, thisArg)
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

// structuredClone (Chromium <98). Shipped by viem/@wagmi/core/jose on the
// web3 + auth paths. A JSON round-trip is not a faithful substitute: it drops
// Map/Set/Date/RegExp/ArrayBuffer/typed arrays and throws on cycles. This
// recursive clone handles the common structured-cloneable types, tracking a
// WeakMap so shared and circular references clone once. Exported (named) for
// direct unit testing.
function cloneValue(value: unknown, seen: WeakMap<object, unknown>): unknown {
  if (value === null || typeof value !== 'object') return value

  // Only non-null objects are ever stored, so a hit is unambiguous and one
  // lookup suffices (handles shared and circular references).
  const obj = value as object
  const cached = seen.get(obj)
  if (cached !== undefined) return cached

  if (value instanceof Date) return new Date(value.getTime())
  if (value instanceof RegExp) return new RegExp(value.source, value.flags)
  if (value instanceof ArrayBuffer) return value.slice(0)
  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView & { length?: number }
    const Ctor = value.constructor as new (buffer: ArrayBuffer, byteOffset: number, length?: number) => ArrayBufferView
    return new Ctor(view.buffer.slice(0) as ArrayBuffer, view.byteOffset, view.length)
  }

  if (value instanceof Map) {
    const result = new Map()
    seen.set(obj, result)
    value.forEach((v, k) => result.set(cloneValue(k, seen), cloneValue(v, seen)))
    return result
  }
  if (value instanceof Set) {
    const result = new Set()
    seen.set(obj, result)
    value.forEach(v => result.add(cloneValue(v, seen)))
    return result
  }
  if (Array.isArray(value)) {
    const result: unknown[] = new Array(value.length)
    seen.set(obj, result)
    for (let i = 0; i < value.length; i++) result[i] = cloneValue(value[i], seen)
    return result
  }

  // Native structuredClone copies only enumerable own string-keyed properties.
  const result: Record<string, unknown> = {}
  seen.set(obj, result)
  for (const key of Object.keys(value)) {
    result[key] = cloneValue((value as Record<string, unknown>)[key], seen)
  }
  return result
}

export function structuredCloneImpl<T>(value: T): T {
  return cloneValue(value, new WeakMap()) as T
}

if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = structuredCloneImpl
}

export default defineNuxtPlugin(() => {})
