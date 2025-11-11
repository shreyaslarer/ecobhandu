// Centralized design tokens for EcoBhandu.
// These are platform-agnostic values used to build themed components & styles.
// If you later introduce a design system layer (e.g. Tamagui / NativeWind),
// you can map these tokens directly there.

export const DesignTokens = {
  colors: {
    black: '#0B0B0B', // Deep Black (text/buttons)
    brand: '#C3D105', // Green-Yellow accent (primary CTA) from HTML
    forest: '#1F7A3A', // Forest Green (success, badges)
    surface: '#F7F8F9', // Neutral Light (cards / surfaces)
    muted: '#9AA0A6', // Muted Gray (subtext)
    danger: '#E04E4E', // Urgency Red
  },
  typography: {
    headlineLg: 28,
    headline: 24,
    headlineSm: 20,
    subhead: 16,
    body: 14,
    micro: 12,
    // Font weights (React Native numeric weights or descriptive keys)
    weight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    family: {
      // Inter not yet loaded; add font files under assets/fonts and load with useFonts.
      display: 'Inter',
      body: 'Inter',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    card: 12,
    pill: 999,
  },
  icon: {
    // Reference style guidelines only; if you adopt a specific icon library,
    // map sizes here.
    size: {
      sm: 16,
      md: 24,
      lg: 32,
      xl: 48,
    },
    stroke: 2, // monoline weight guideline
  },
  layout: {
    safeTop: 24, // default top safe area margin for custom headers
    viewportWidth: 375,
    viewportHeight: 812,
  },
  elevation: {
    // Placeholder numeric levels; can map to shadow styles later.
    level1: 1,
    level2: 3,
    level3: 6,
  },
} as const;

export type DesignTokensType = typeof DesignTokens;
export type ColorToken = keyof typeof DesignTokens.colors;

// Helper examples (not yet used):
export const spacingValue = (key: keyof typeof DesignTokens.spacing) => DesignTokens.spacing[key];
export const radiusValue = (key: keyof typeof DesignTokens.radius) => DesignTokens.radius[key];
