if (!Object.hasOwn) {
  Object.hasOwn = function (obj: Record<string | number | symbol, unknown>, prop: string | number | symbol): boolean {
    return Object.prototype.hasOwnProperty.call(obj, prop)
  }
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
