import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useStyles, type Theme } from '@/theme';

import { AppText } from './AppText';

export interface ScreenHeaderProps {
  title: string;
  /** Small line above the title, e.g. today's date. */
  eyebrow?: string;
  subtitle?: string;
  /** Optional element on the right, e.g. an icon button. */
  trailing?: ReactNode;
}

/** Large, left-aligned screen title. Replaces the default navigation header. */
export function ScreenHeader({ title, eyebrow, subtitle, trailing }: ScreenHeaderProps) {
  const styles = useStyles(createStyles);

  return (
    <View style={styles.container}>
      <View style={styles.text}>
        {eyebrow && (
          <AppText variant="subhead" tone="secondary">
            {eyebrow}
          </AppText>
        )}
        <AppText variant="largeTitle" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle && (
          <AppText variant="callout" tone="secondary" style={styles.subtitle}>
            {subtitle}
          </AppText>
        )}
      </View>
      {trailing}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.xxl,
    },
    text: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    subtitle: {
      marginTop: theme.spacing.xs,
    },
  });
