import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useStyles, useTheme, type Theme, type Tone } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { IconBadge } from './IconBadge';
import { Touchable } from './Touchable';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Shorthand for a leading IconBadge. */
  icon?: IconName;
  iconTone?: Tone;
  /** Custom leading element. Overrides `icon`. */
  leading?: ReactNode;
  /** Right-aligned secondary text, e.g. "2.0.0". */
  value?: string;
  /** Custom right-side element, e.g. a Toggle or Tag. */
  trailing?: ReactNode;
  showChevron?: boolean;
  destructive?: boolean;
  onPress?: () => void;
  accessibilityHint?: string;
}

/** A single row for settings, lists and navigation. Place rows inside a ListGroup. */
export function ListRow({
  title,
  subtitle,
  icon,
  iconTone = 'neutral',
  leading,
  value,
  trailing,
  showChevron = false,
  destructive = false,
  onPress,
  accessibilityHint,
}: ListRowProps) {
  const { colors } = useTheme();
  const styles = useStyles(createStyles);

  const content = (
    <>
      {leading ?? (icon && <IconBadge name={icon} tone={destructive ? 'danger' : iconTone} />)}
      <View style={styles.text}>
        <AppText variant="body" tone={destructive ? 'danger' : 'primary'} style={styles.title}>
          {title}
        </AppText>
        {subtitle && (
          <AppText variant="footnote" tone="secondary">
            {subtitle}
          </AppText>
        )}
      </View>
      {value && (
        <AppText variant="callout" tone="secondary">
          {value}
        </AppText>
      )}
      {trailing}
      {showChevron && <Icon name="chevron-forward" size="sm" color={colors.textTertiary} />}
    </>
  );

  if (onPress) {
    return (
      <Touchable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityHint={accessibilityHint}
        style={styles.row}
        pressedStyle={styles.pressed}
      >
        {content}
      </Touchable>
    );
  }

  return <View style={styles.row}>{content}</View>;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      minHeight: 56,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    pressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    text: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    title: {
      fontWeight: '500',
    },
  });
