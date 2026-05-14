export const PULL_THRESHOLD = 80
export const MAX_PULL_DISTANCE = 120
// Safety timeout to reset refreshing state if reload doesn't navigate away
export const REFRESH_TIMEOUT = 5000
// Dampening factor so the content moves slower than the finger, giving a rubber-band feel
export const PULL_RESISTANCE = 0.5
// Minimum pull distance (px) before we preventDefault to avoid hijacking normal scroll taps
export const PREVENT_SCROLL_THRESHOLD = 10
// Duration (ms) of the snap-back animation when releasing below threshold
export const SNAP_BACK_DURATION = 300
