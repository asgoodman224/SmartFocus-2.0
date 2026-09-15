import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing, useStyles, useTheme, type Theme } from '@/theme';

import { Touchable } from './Touchable';

export interface CardProps {
  children: ReactNode;
  /** Inner padding from the spacing scale. Use 'none' for edge-to-edge lists. */
  padding?: keyof typeof spacing;
  /** 'default' is a bordered surface; 'muted' is a flat inset area. */
  variant?: 'default' | 'muted';
  /** Makes the whole card tappable. */
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/** A grouped surface. Keep cards focused on one idea; don't nest them. */
export function Card({
  children,
  padding = 'lg',
  variant = 'default',
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
}: CardProps) {
  const theme = useTheme();
  const styles = useStyles(createStyles);
  const cardStyle = [styles.base, styles[variant], { padding: theme.spacing[padding] }, style];

  if (onPress) {
    return (
      <Touchable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={cardStyle}
        pressedStyle={styles.pressed}
      >
        {children}
      </Touchable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
    },
    default: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    muted: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    pressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
  });
