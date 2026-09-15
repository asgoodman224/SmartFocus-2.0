import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useStyles, type Theme } from '@/theme';

export interface MetricTileProps {
  label: string;
  value: string;
  /** Small suffix next to the value, e.g. "/ 100". */
  unit?: string;
  /** Screen-reader text for the value, e.g. "3 hours 46 minutes" for "3h 46m". */
  valueAccessibilityLabel?: string;
  /** Usually a TrendLabel. */
  trend?: ReactNode;
  caption?: string;
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}

/** Label + value (+ trend). Unboxed, so parents can arrange tiles in rows inside a Card. */
export function MetricTile({
  label,
  value,
  unit,
  valueAccessibilityLabel,
  trend,
  caption,
  size = 'md',
  style,
}: MetricTileProps) {
  const styles = useStyles(createStyles);

  return (
    <View style={[styles.tile, style]}>
      <AppText variant="footnote" tone="secondary" numberOfLines={1}>
        {label}
      </AppText>
      <View style={styles.valueRow}>
        <AppText
          variant={size === 'lg' ? 'display' : 'title'}
          style={styles.value}
          accessibilityLabel={valueAccessibilityLabel}
        >
          {value}
        </AppText>
        {unit && (
          <AppText variant="subhead" tone="tertiary">
            {unit}
          </AppText>
        )}
      </View>
      {trend}
      {caption && (
        <AppText variant="footnote" tone="tertiary">
          {caption}
        </AppText>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    tile: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: theme.spacing.xs,
    },
    value: {
      fontVariant: ['tabular-nums'],
    },
  });
