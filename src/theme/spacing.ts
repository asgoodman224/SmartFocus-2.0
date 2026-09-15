import { StyleSheet } from 'react-native';

/** 4-point spacing scale. Use these instead of arbitrary numbers. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

/** Corner radii. Kept modest on purpose: cards are not pills. */
export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
} as const;

export const layout = {
  /** Horizontal padding for every screen. */
  screenGutter: 20,
  /** Minimum touch target (Material recommends 48dp, Apple 44pt). */
  minTouchTarget: 48,
  /** Keeps content readable on large Android phones, foldables and tablets. */
  maxContentWidth: 640,
  hairline: StyleSheet.hairlineWidth,
  iconSize: {
    sm: 16,
    md: 20,
    lg: 24,
  },
} as const;
