import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/theme';

/** Any Ionicons glyph name. Prefer the "-outline" style; use filled glyphs for selected states. */
export type IconName = ComponentProps<typeof Ionicons>['name'];

export interface IconProps {
  name: IconName;
  size?: 'sm' | 'md' | 'lg' | number;
  color?: ColorValue;
}

/**
 * Icon wrapper. Icons are hidden from screen readers because they are
 * decorative; put the accessible label on the parent control.
 */
export function Icon({ name, size = 'md', color }: IconProps) {
  const { colors, layout } = useTheme();

  return (
    <Ionicons
      name={name}
      size={typeof size === 'number' ? size : layout.iconSize[size]}
      color={color ?? colors.textPrimary}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
