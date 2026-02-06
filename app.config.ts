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
          class: 'text-theme-cyan dark:text-theme-black',
        },
        {
          variant: 'outline',
          class: 'ring-2 bg-transparent',
        },
        {
          color: 'primary',
          variant: 'outline',
          class: 'ring-theme-black dark:ring-muted',
        },
      ],
    },
    checkbox: {
      slots: {
        base: 'ring-2 ring-theme-black dark:ring-muted',
      },
      variants: {
        disabled: {
          true: {
            base: 'opacity-30',
            label: 'opacity-30',
            description: 'opacity-30',
          },
        },
      },
    },
    icons: {
      close: 'i-material-symbols-close-rounded',
    },
    select: {
      slots: {
        base: 'disabled:opacity-30',
      },
      compoundVariants: [
        {
          color: 'primary',
          variant: 'outline',
          class: 'ring-2 ring-theme-black dark:ring-muted',
        },
      ],
    },
  },
})
