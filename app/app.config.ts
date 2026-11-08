export default defineAppConfig({
  ui: {
    // The blue and teal of the icon and the social card (#2563eb, #0f766e).
    colors: {
      primary: 'blue',
      secondary: 'teal',
      neutral: 'slate'
    },
    // Compact headers on every page: the default hero padding pushed the exercise below the
    // first screen of a phone. Applies to the legal pages too, so all headers look the same.
    pageHeader: {
      slots: {
        root: 'py-6 sm:py-8',
        title: 'text-2xl sm:text-4xl',
        description: 'text-base sm:text-lg'
      },
      variants: {
        title: {
          true: {
            description: 'mt-2 sm:mt-3'
          }
        }
      }
    },
    pageSection: {
      slots: {
        container: 'py-8 sm:py-12 lg:py-16'
      }
    }
  }
})
