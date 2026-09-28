import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme';

export interface BarDatum {
  key: string;
  label: string;
  value: number;
}

export interface BarChartProps {
  data: BarDatum[];
  /** Top of the scale, e.g. 100 for scores. Defaults to the largest value. */
  maxValue?: number;
  height?: number;
  /**
   * Bar to emphasize (e.g. today, or the busiest hour). When set, other bars
   * are neutral; when omitted, all bars use the accent color.
   */
  highlightKey?: string;
  /** Show every nth label. Useful for 24 hourly bars. */
  labelEvery?: number;
  /** Summary read by screen readers in place of the individual bars. */
  accessibilityLabel: string;
}

/**
 * A simple vertical bar chart built from Views, with no chart library. Enough
 * for the small trend charts SmartFocus needs. Swap in victory-native or
 * react-native-skia later if you need axes, tooltips or animation.
 */
export function BarChart({
  data,
  maxValue,
  height = 120,
  highlightKey,
  labelEvery = 1,
  accessibilityLabel,
}: BarChartProps) {
  const { colors, spacing, layout } = useTheme();

  const max = maxValue ?? Math.max(1, ...data.map((d) => d.value));
  const isDense = data.length > 12;
  const gap = isDense ? 2 : spacing.sm;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <View
        style={[
          styles.bars,
          { height, gap, borderBottomWidth: layout.hairline, borderBottomColor: colors.border },
        ]}
      >
        {data.map((datum) => {
          const ratio = Math.min(datum.value / max, 1);
          const isHighlighted = highlightKey === undefined || datum.key === highlightKey;
          return (
            <View key={datum.key} style={styles.slot}>
              <View
                style={[
                  styles.bar,
                  {
                    height: ratio > 0 ? Math.max(ratio * height, 3) : 0,
                    maxWidth: isDense ? 10 : 28,
                    borderRadius: isDense ? 2 : 4,
                    backgroundColor: isHighlighted ? colors.primary : colors.borderStrong,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={[styles.labels, { gap, marginTop: spacing.sm }]}>
        {data.map((datum, index) => (
          <View key={datum.key} style={styles.slot}>
            {index % labelEvery === 0 && (
              <AppText
                variant="caption"
                tone={datum.key === highlightKey ? 'primary' : 'tertiary'}
                numberOfLines={1}
                style={styles.label}
              >
                {datum.label}
              </AppText>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  labels: {
    flexDirection: 'row',
  },
  slot: {
    flex: 1,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  label: {
    // Wider than a dense slot on purpose, so labels like "12 PM" aren't clipped.
    width: 52,
    // react-native-web caps single-line text at its container's width; undo that.
    maxWidth: 52,
    textAlign: 'center',
  },
});
