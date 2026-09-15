import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/theme';

export interface TrendLabelProps {
  /** Signed change, e.g. -9 for "9% less". */
  change: number;
  /** Formats the absolute change, e.g. (n) => `${n}%`. */
  format: (absoluteChange: number) => string;
  /** True when an increase is good (focus score), false when it isn't (screen time). */
  higherIsBetter: boolean;
  /** Context after the value, e.g. "vs. yesterday". */
  context?: string;
}

/**
 * Arrow + change, e.g. "↓ 9% vs. average".
 *
 * Improvements are shown in green. Changes in the other direction stay neutral
 * grey rather than red: SmartFocus describes habits, it doesn't scold.
 */
export function TrendLabel({ change, format, higherIsBetter, context }: TrendLabelProps) {
  const { colors, spacing } = useTheme();

  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  const improved = direction !== 'flat' && (direction === 'up') === higherIsBetter;
  const color = improved ? colors.success : colors.textSecondary;
  const formatted = format(Math.abs(change));
  const spokenDirection = { up: 'up', down: 'down', flat: 'no change,' }[direction];

  return (
    <View
      style={[styles.row, { gap: spacing.xxs }]}
      accessible
      accessibilityLabel={`${spokenDirection} ${formatted}${context ? ` ${context}` : ''}`}
    >
      <Icon
        name={direction === 'up' ? 'arrow-up' : direction === 'down' ? 'arrow-down' : 'remove'}
        size={13}
        color={color}
      />
      <AppText variant="footnote" color={color} style={styles.value}>
        {formatted}
      </AppText>
      {context && (
        <AppText variant="footnote" tone="secondary">
          {context}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  value: {
    fontWeight: '600',
    marginRight: 2,
  },
});
