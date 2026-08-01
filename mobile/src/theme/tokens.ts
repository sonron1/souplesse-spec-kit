// Tokens de design — valeurs exactes reprises des prototypes HTML validés.
// Ne pas modifier ces valeurs sans validation explicite d'Ange.
// Source : specs/2-mobile-app/prototypes/souplesse-prototype-paiement-v3.html
//          et souplesse-auth-dashboards.html

export const colors = {
  bg: '#0A0A0C',
  surface: '#16161A',
  surface2: '#1E1E23',
  border: '#2B2B31',
  brand: '#EAB308',        // couleur de marque officielle du site souplessefitness.com
  brandSoft: 'rgba(234,179,8,0.14)',
  text: '#F5F5F4',
  muted: '#96959D',
  good: '#22C55E',
  goodSoft: 'rgba(34,197,94,0.14)',
  bad: '#EF4444',
  badSoft: 'rgba(239,68,68,0.14)',
  info: '#3B82F6',
  infoSoft: 'rgba(59,130,246,0.14)',
} as const;

export const fonts = {
  display: 'Manrope_800ExtraBold', // titres — via @expo-google-fonts/manrope
  displaySemi: 'Manrope_700Bold',
  body: 'Inter_400Regular',        // texte courant — via @expo-google-fonts/inter
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const radii = {
  sm: 11,
  md: 14,
  lg: 16,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 32,
} as const;
