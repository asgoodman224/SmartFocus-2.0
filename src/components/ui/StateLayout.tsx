import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useStyles, useTheme, type Theme } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export interface StateLayoutProps {
  icon?: ReactNode;
  title?: string;
  message?: string;
  action?: ReactNode;
  /** Less vertical padding, for use inside a section or card. */
  compact?: boolean;
}

/** Shared centered layout for LoadingState, EmptyState and ErrorState. */
export function StateLayout({ icon, title, message, action, compact = false }: StateLayoutProps) {
  const styles = useStyles(createStyles);

  return (
    <View style={[styles.container, compact ? styles.compact : styles.full]} accessibilityLiveRegion="polite">
      {icon && <View style={styles.icon}>{icon}</View>}
      {title && (
        <AppText variant="headline" align="center">
          {title}
        </AppText>
      )}
      {message && (
        <AppText variant="callout" tone="secondary" align="center" style={styles.message}>
          {message}
        </AppText>
      )}
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

/** Icon inside a soft circle, used at the top of empty and error states. */
export function StateIcon({ name }: { name: IconName }) {
  const { colors } = useTheme();
  const styles = useStyles(createStyles);

  return (
    <View style={styles.iconCircle}>
      <Icon name={name} size="lg" color={colors.textSecondary} />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.xxl,
    },
    full: {
      paddingVertical: theme.spacing.huge,
    },
    compact: {
      paddingVertical: theme.spacing.xxl,
    },
    icon: {
      marginBottom: theme.spacing.sm,
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: theme.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    message: {
      maxWidth: 320,
    },
    action: {
      marginTop: theme.spacing.md,
    },
  });
