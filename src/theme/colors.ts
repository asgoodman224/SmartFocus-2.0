import type { UsageCategory } from '@/types/models';

/**
 * Color tokens.
 *
 * Screens and components never use hex values directly. They read semantic
 * tokens (e.g. `colors.textSecondary`) from `useTheme()`, so light and dark
 * mode stay in sync and palette changes happen in this one file.
 *
 * The palette is intentionally restrained: neutral greys for almost
 * everything, one blue accent for primary actions and selection, and status
 * colors only where they carry meaning.
 */

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  /** App background behind all content. */
  background: string;
  /** Cards, list groups, the tab bar. */
  surface: string;
  /** Inset areas: inputs, chart tracks, unselected segments. */
  surfaceMuted: string;
  border: string;
  borderStrong: string;

  textPrimary: string;
  /** Supporting text. Meets WCAG AA contrast on `surface` and `background`. */
  textSecondary: string;
  /** Placeholders and de-emphasized metadata only. */
  textTertiary: string;
  textOnPrimary: string;

  primary: string;
  primaryPressed: string;
  /** Tinted background for selected states and icon containers. */
  primaryMuted: string;

  success: string;
  successMuted: string;
  warning: string;
  warningMuted: string;
  danger: string;
  dangerMuted: string;

  /** Android ripple color and pressed-state overlay. */
  pressedOverlay: string;

  /** One color per app-usage category, used in charts and legends. */
  category: Record<UsageCategory, string>;
}

const light: Palette = {
  background: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceMuted: '#EDEFF2',
  border: '#E2E5EA',
  borderStrong: '#C9CED6',

  textPrimary: '#15181D',
  textSecondary: '#535B67',
  textTertiary: '#7D8591',
  textOnPrimary: '#FFFFFF',

  primary: '#2D5BD3',
  primaryPressed: '#2349B0',
  primaryMuted: '#E9EFFC',

  success: '#1D7F55',
  successMuted: '#E4F4EC',
  warning: '#8F5B10',
  warningMuted: '#FBF0DC',
  danger: '#C2362C',
  dangerMuted: '#FBE9E7',

  pressedOverlay: 'rgba(21, 24, 29, 0.08)',

  category: {
    productivity: '#2D5BD3',
    communication: '#2E8C80',
    social: '#C2772A',
    entertainment: '#8458C2',
    other: '#9AA1AC',
  },
};

const dark: Palette = {
  background: '#0D0F12',
  surface: '#16191E',
  surfaceMuted: '#1F2329',
  border: '#272C33',
  borderStrong: '#394049',

  textPrimary: '#F1F3F6',
  textSecondary: '#A9B0BB',
  textTertiary: '#7E8692',
  textOnPrimary: '#0D0F12',

  primary: '#7B9BFF',
  primaryPressed: '#6384EE',
  primaryMuted: '#1B2440',

  success: '#4FC08D',
  successMuted: '#14291F',
  warning: '#E0A84E',
  warningMuted: '#2E2413',
  danger: '#F2766B',
  dangerMuted: '#34191A',

  pressedOverlay: 'rgba(241, 243, 246, 0.12)',

  category: {
    productivity: '#7B9BFF',
    communication: '#4FB8A9',
    social: '#E09A52',
    entertainment: '#AC86E6',
    other: '#6E7682',
  },
};

export const palettes: Record<ColorScheme, Palette> = { light, dark };

/** Shared status tones for tags, icon badges and similar small indicators. */
export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export function getToneColors(colors: Palette, tone: Tone): { foreground: string; background: string } {
  switch (tone) {
    case 'accent':
      return { foreground: colors.primary, background: colors.primaryMuted };
    case 'success':
      return { foreground: colors.success, background: colors.successMuted };
    case 'warning':
      return { foreground: colors.warning, background: colors.warningMuted };
    case 'danger':
      return { foreground: colors.danger, background: colors.dangerMuted };
    case 'neutral':
      return { foreground: colors.textSecondary, background: colors.surfaceMuted };
  }
}
