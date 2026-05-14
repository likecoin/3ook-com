/**
 * Base annotation color RGB values from Tailwind 600-shade colors
 */
const ANNOTATION_COLOR_RGB: Record<AnnotationColor, string> = {
  yellow: '202, 138, 4',
  red: '220, 38, 38',
  green: '22, 163, 74',
  blue: '37, 99, 235',
}

/**
 * Valid annotation color values for validation
 */
export const ANNOTATION_COLORS = Object.keys(ANNOTATION_COLOR_RGB) as AnnotationColor[]

/**
 * Helper function to create rgba color string with specified opacity
 */
function createAnnotationColorMap(opacity = 1): Record<AnnotationColor, string> {
  return ANNOTATION_COLORS.reduce((acc, color) => {
    acc[color] = `rgba(${ANNOTATION_COLOR_RGB[color]}, ${opacity})`
    return acc
  }, {} as Record<AnnotationColor, string>)
}

/**
 * Annotation color indicators for UI elements (dots, badges)
 */
export const ANNOTATION_INDICATOR_COLORS_MAP = createAnnotationColorMap()

/**
 * Annotation highlight colors with 40% opacity for text highlighting
 */
export const ANNOTATION_COLORS_MAP = createAnnotationColorMap(0.4)

export const ANNOTATION_TEXT_MAX_LENGTH = 100
export const ANNOTATION_NOTE_MAX_LENGTH = 1000
