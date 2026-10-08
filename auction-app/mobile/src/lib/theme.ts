import { useColorScheme } from 'react-native';

const palette = {
  light: {
    background: '#F6F7F9',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF0F4',
    border: '#E2E5EB',
    text: '#0B1220',
    textMuted: '#5B6577',
    textFaint: '#8C95A6',
    primary: '#4F46E5',
    primaryText: '#FFFFFF',
    primarySoft: '#EEF0FF',
    accent: '#F59E0B',
    success: '#059669',
    successSoft: '#E7F7F0',
    danger: '#DC2626',
    dangerSoft: '#FDECEC',
    warning: '#B45309',
    warningSoft: '#FEF3E2',
    overlay: 'rgba(11,18,32,0.45)',
  },
  dark: {
    background: '#0B1220',
    surface: '#131C2E',
    surfaceAlt: '#1B263B',
    border: '#24314A',
    text: '#F3F5F9',
    textMuted: '#A3ADBF',
    textFaint: '#6F7A8F',
    primary: '#818CF8',
    primaryText: '#0B1220',
    primarySoft: '#1E2447',
    accent: '#FBBF24',
    success: '#34D399',
    successSoft: '#0F2E26',
    danger: '#F87171',
    dangerSoft: '#3A1717',
    warning: '#FBBF24',
    warningSoft: '#33260C',
    overlay: 'rgba(0,0,0,0.6)',
  },
};

export type Colors = typeof palette.light;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };
export const font = {
  title: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  small: { fontSize: 13, fontWeight: '500' as const },
  tiny: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.4 },
  price: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5, fontVariant: ['tabular-nums' as const] },
};

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? palette.dark : palette.light;
}

export function useIsDark() {
  return useColorScheme() === 'dark';
}
