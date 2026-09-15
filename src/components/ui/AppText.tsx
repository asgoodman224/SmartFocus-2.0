import { Text, type TextProps, type TextStyle } from 'react-native';

import { MAX_FONT_SCALE, useTheme, type Palette, type TypographyVariant } from '@/theme';

export type TextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'onPrimary';

function toneColor(colors: Palette, tone: TextTone): string {
  switch (tone) {
    case 'primary':
      return colors.textPrimary;
    case 'secondary':
      return colors.textSecondary;
    case 'tertiary':
      return colors.textTertiary;
    case 'accent':
      return colors.primary;
    case 'success':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'danger':
      return colors.danger;
    case 'onPrimary':
      return colors.textOnPrimary;
  }
}

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
  /** Exact color override. Prefer `tone`. */
  color?: string;
  align?: TextStyle['textAlign'];
}

/** The text component for all app UI. Applies the type scale and theme colors. */
export function AppText({
  variant = 'body',
  tone = 'primary',
  color,
  align,
  style,
  ...rest
}: AppTextProps) {
  const { colors, typography } = useTheme();

  return (
    <Text
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      {...rest}
      style={[
        typography[variant],
        { color: color ?? toneColor(colors, tone) },
        align !== undefined && { textAlign: align },
        style,
      ]}
    />
  );
}
