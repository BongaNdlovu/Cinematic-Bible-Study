    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            serif: ['Newsreader', 'Lora', 'Georgia', 'serif'],
            bodySerif: ['Lora', 'Georgia', 'serif'],
            sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
            vhs: ['VT323', 'JetBrains Mono', 'monospace'],
          },
          colors: {
            paper: {
              50: '#FDFBF7',
              100: '#F5F2E9',
              200: '#EAE5D8',
              300: '#DBD4C2',
              400: '#E6DCC8',
              500: '#D4C9B2',
              800: '#2A2926',
              900: '#1A1918',
              950: '#0F0E0D',
            },
            ink: {
              900: '#141414',
              800: '#222222',
              700: '#383838',
              600: '#525252',
              500: '#6E6E6E',
              400: '#9E9E9E',
            },
            advent: {
              700: '#0D47A1',   /* Sanctuary deep sapphire */
              800: '#1A237E',
              gold: '#C59B27',  /* Ark of the Covenant Gold */
              crimson: '#881337',
            }
          }
        }
      }
    }
