export const colors = {
  background: '#F8F3E8',
  surface: '#FFFCF6',
  surfaceMuted: '#EDE6D8',
  surfaceWarm: '#F3ECDD',
  primary: '#123F3A',
  primarySoft: '#DFECE8',
  success: '#0F6B56',
  successSoft: '#DCEFE8',
  gold: '#B9872C',
  goldSoft: '#F5E9CC',
  warning: '#795313',
  warningSoft: '#FFF4D6',
  danger: '#A83B36',
  dangerSoft: '#F9E4E1',
  text: '#18362F',
  textMuted: '#66766F',
  border: '#DED4C2',
  borderStrong: '#BFAF92',
  locked: '#9A978D',
  overlay: 'rgba(18, 63, 58, 0.08)',
  mushafPaper: '#FAF6ED',
  mushafBorder: '#D8CEB9',
  mushafBorderInner: '#EFE7D5',
  mushafGold: '#9B783E',
  mushafGreen: '#184D42',
} as const;

export const fonts = {
  regular: 'SourceSans3_400Regular',
  medium: 'SourceSans3_600SemiBold',
  bold: 'SourceSans3_700Bold',
  arabic: 'NotoNaskhArabic_400Regular',
  arabicMedium: 'NotoNaskhArabic_600SemiBold',
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  xxl: 32,
} as const;

export const shadows = {
  card: '0px 4px 14px rgba(32, 57, 49, 0.09)',
  raised: '0px 10px 26px rgba(32, 57, 49, 0.16)',
} as const;

export const touch = {
  minimum: 44,
} as const;

export const motion = {
  quick: 160,
  enter: 240,
} as const;
