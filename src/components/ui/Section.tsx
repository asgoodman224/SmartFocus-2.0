import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useStyles, type Theme } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';

export interface SectionProps {
  title?: string;
  description?: string;
  /** A text action aligned right of the title, e.g. "See all". */
  action?: { label: string; onPress: () => void };
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** A titled block of content. Provides consistent spacing between sections. */
export function Section({ title, description, action, children, style }: SectionProps) {
  const styles = useStyles(createStyles);

  return (
    <View style={[styles.section, style]}>
      {title && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="headline" accessibilityRole="header">
              {title}
            </AppText>
            {description && (
              <AppText variant="footnote" tone="secondary">
                {description}
              </AppText>
            )}
          </View>
          {action && (
            <Button
              title={action.label}
              onPress={action.onPress}
              variant="ghost"
              size="sm"
              style={styles.action}
            />
          )}
        </View>
      )}
      {children}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: {
      marginBottom: theme.spacing.xxxl,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    headerText: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    action: {
      // Aligns the label with the screen edge while keeping the padded touch area.
      marginRight: -theme.spacing.md,
    },
  });
