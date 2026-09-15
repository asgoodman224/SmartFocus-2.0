import { StyleSheet, View } from 'react-native';

import { AppText, Touchable } from '@/components/ui';
import { useStyles, type Theme } from '@/theme';
import type { Rating } from '@/types/models';

const RATINGS: Rating[] = [1, 2, 3, 4, 5];

export interface RatingScaleProps {
  label: string;
  lowLabel: string;
  highLabel: string;
  value: Rating | undefined;
  onChange: (value: Rating) => void;
}

/** A 1–5 scale of large, evenly spaced options with labeled endpoints. */
export function RatingScale({ label, lowLabel, highLabel, value, onChange }: RatingScaleProps) {
  const styles = useStyles(createStyles);

  return (
    <View>
      <View style={styles.header}>
        <AppText variant="headline">{label}</AppText>
        {value !== undefined && (
          <AppText variant="subhead" tone="secondary">
            {value} of 5
          </AppText>
        )}
      </View>

      <View style={styles.options} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {RATINGS.map((rating) => {
          const selected = rating === value;
          const endpoint = rating === 1 ? `, ${lowLabel}` : rating === 5 ? `, ${highLabel}` : '';
          return (
            <Touchable
              key={rating}
              onPress={() => onChange(rating)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${label} ${rating} of 5${endpoint}`}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <AppText variant="bodyStrong" tone={selected ? 'onPrimary' : 'primary'}>
                {rating}
              </AppText>
            </Touchable>
          );
        })}
      </View>

      <View style={styles.endpoints}>
        <AppText variant="caption" tone="tertiary">
          {lowLabel}
        </AppText>
        <AppText variant="caption" tone="tertiary">
          {highLabel}
        </AppText>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    options: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    option: {
      flex: 1,
      minHeight: theme.layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceMuted,
      overflow: 'hidden',
    },
    optionSelected: {
      backgroundColor: theme.colors.primary,
    },
    endpoints: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: theme.spacing.xs,
    },
  });
