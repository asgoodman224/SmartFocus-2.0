import type { TextStyle } from 'react-native';

/**
 * Type scale.
 *
 * Uses the platform system font (SF Pro on iOS, Roboto on Android), so text
 * feels native and no font files need to load. Text responds to the user's
 * OS text-size setting, capped by `MAX_FONT_SCALE` so layouts stay intact at
 * the largest accessibility sizes.
 */

export const MAX_FONT_SCALE = 1.6;

export type TypographyVariant =
  | 'display'
  | 'largeTitle'
  | 'title'
  | 'headline'
  | 'body'
  | 'bodyStrong'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption'
  | 'overline';

export const typography: Record<TypographyVariant, TextStyle> = {
  /** Hero numbers, e.g. the focus score. Tabular figures keep digits aligned. */
  display: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '700',
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  /** Screen titles. */
  largeTitle: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.4 },
  /** Metric values and prominent headings. */
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.2 },
  /** Section and card titles. */
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600' },
  /** List-row titles and secondary paragraphs. */
  callout: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  /** Labels and supporting text. */
  subhead: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  /** Small uppercase labels. Use sparingly. */
  overline: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
};
