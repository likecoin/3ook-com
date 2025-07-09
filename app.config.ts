export default defineAppConfig({
  ui: {
    colors: {
      primary: 'theme',
      secondary: 'green',

      neutral: 'neutral',
    },
    button: {
      base: 'disabled:opacity-30',
      compoundVariants: [
        {
          color: 'primary',
          variant: 'solid',
          class: 'text-theme-50',
        },
        {
          color: 'primary',
          variant: 'outline',
          class: 'ring-2 ring-theme-500',
        },
      ],
    },
    select: {
      compoundVariants: [
        {
          color: 'primary',
          variant: 'outline',
          class: 'ring-2 ring-theme-500',
        },
      ],
    },
  },
})
