export interface ABTestConfig {
  testName: string
  variants: string[]
  weights?: number[]
  defaultVariant?: string
  maxAge?: number
}

export function useABTest(config: ABTestConfig) {
  const {
    testName,
    variants,
    weights = variants.map(() => 1 / variants.length),
    maxAge = 60 * 60 * 24 * 30, // 30 days
  } = config

  // Validate configuration
  if (variants.length === 0) {
    throw createError({
      statusCode: 500,
      statusMessage: 'AB test must have at least one variant',
    })
  }

  const defaultVariant = config.defaultVariant ?? variants[0]!

  if (weights.length !== variants.length) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Weights array must match variants array length',
    })
  }

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  if (Math.abs(totalWeight - 1) > 0.001) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Weights must sum to 1',
    })
  }

  function assignVariant(): string {
    const random = Math.random()
    let cumulativeWeight = 0

    for (let i = 0; i < variants.length; i++) {
      cumulativeWeight += weights[i]!
      if (random <= cumulativeWeight) {
        return variants[i]!
      }
    }

    return defaultVariant
  }

  const variantCookie = useCookie<string>(`3ook-exp-${testName}`, {
    default: () => assignVariant(),
    maxAge,
    sameSite: 'lax',
    secure: !import.meta.dev,
  })

  // Validate stored variant is still valid
  if (!variants.includes(variantCookie.value)) {
    variantCookie.value = assignVariant()
  }

  function isVariant(variant: string): boolean {
    return variantCookie.value === variant
  }

  onMounted(() => {
    useLogEvent(`exp-${testName}-${variantCookie.value}`)
  })

  return {
    variant: readonly(variantCookie),
    isVariant,
  }
}
