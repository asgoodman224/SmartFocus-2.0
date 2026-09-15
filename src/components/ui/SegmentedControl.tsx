import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useStyles, type Theme } from '@/theme';

import { AppText } from './AppText';
import { Touchable } from './Touchable';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Switches between 2–4 views of the same content, e.g. Today / Last 7 days. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  style,
}: SegmentedControlProps<T>) {
  const styles = useStyles(createStyles);

  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} style={[styles.track, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Touchable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && styles.selected]}
            pressedStyle={styles.pressed}
          >
            <AppText
              variant="subhead"
              tone={selected ? 'primary' : 'secondary'}
              numberOfLines={1}
              style={selected && styles.selectedLabel}
            >
              {option.label}
            </AppText>
          </Touchable>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      padding: theme.spacing.xxs,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceMuted,
    },
    segment: {
      flex: 1,
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.md - theme.spacing.xxs,
      // Android needs clipping for the ripple; iOS must not clip the shadow.
      overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
    },
    selected: {
      backgroundColor: theme.scheme === 'dark' ? theme.colors.borderStrong : theme.colors.surface,
      shadowColor: '#000000',
      shadowOpacity: theme.scheme === 'dark' ? 0 : 0.08,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 1 },
      elevation: theme.scheme === 'dark' ? 0 : 1,
    },
    pressed: {
      opacity: 0.7,
    },
    selectedLabel: {
      fontWeight: '600',
    },
  });
