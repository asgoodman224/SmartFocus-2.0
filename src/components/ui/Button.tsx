import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useStyles, useTheme, type Theme } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { Touchable, type TouchableProps } from './Touchable';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps extends Omit<TouchableProps, 'children' | 'style' | 'pressedStyle'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  /** Shows a spinner and blocks presses, keeping the button's size. */
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();
  const styles = useStyles(createStyles);

  const contentColor = {
    primary: colors.textOnPrimary,
    secondary: colors.textPrimary,
    ghost: colors.primary,
    destructive: colors.danger,
  }[variant];

  const isInactive = disabled || loading;

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      disabled={isInactive}
      // Small buttons are visually compact but keep a 48pt touch area.
      hitSlop={size === 'sm' ? 6 : undefined}
      style={[
        styles.base,
        styles[size],
        styles[variant],
        fullWidth && styles.fullWidth,
        disabled && !loading && styles.disabled,
        style,
      ]}
      pressedStyle={variant === 'primary' ? styles.primaryPressed : styles.pressed}
      {...rest}
    >
      <View style={[styles.content, loading && styles.hidden]}>
        {icon && <Icon name={icon} size={size === 'sm' ? 'sm' : 'md'} color={contentColor} />}
        <AppText
          variant={size === 'sm' ? 'subhead' : 'bodyStrong'}
          color={contentColor}
          numberOfLines={1}
          style={styles.label}
        >
          {title}
        </AppText>
      </View>
      {loading && <ActivityIndicator color={contentColor} style={StyleSheet.absoluteFill} />}
    </Touchable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.md,
      overflow: 'hidden',
    },
    md: {
      minHeight: 50,
      paddingHorizontal: theme.spacing.xl,
    },
    sm: {
      minHeight: 36,
      paddingHorizontal: theme.spacing.md,
    },
    primary: { backgroundColor: theme.colors.primary },
    secondary: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
    },
    ghost: { backgroundColor: 'transparent' },
    destructive: { backgroundColor: theme.colors.dangerMuted },
    primaryPressed: { backgroundColor: theme.colors.primaryPressed },
    pressed: { opacity: 0.7 },
    fullWidth: { alignSelf: 'stretch' },
    disabled: { opacity: 0.45 },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    hidden: { opacity: 0 },
    label: { fontWeight: '600' },
  });
