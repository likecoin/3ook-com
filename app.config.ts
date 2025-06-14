export default defineAppConfig({
  ui: {
    colors: {
      primary: 'theme',
      secondary: 'green',

      neutral: 'neutral',
    },
    button: {
      compoundVariants: [
        {
          color: 'primary',
          variant: 'solid',
          class: 'text-theme-50',
        },
      ],
    },
  },
})
