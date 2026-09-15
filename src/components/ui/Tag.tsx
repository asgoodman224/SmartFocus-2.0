import { StyleSheet, View } from 'react-native';

import { getToneColors, useTheme, type Tone } from '@/theme';

import { AppText } from './AppText';

export interface TagProps {
  label: string;
  tone?: Tone;
}

/** A small, non-interactive status label, e.g. "On" or "Mood 4/5". */
export function Tag({ label, tone = 'neutral' }: TagProps) {
  const theme = useTheme();
  const { foreground, background } = getToneColors(theme.colors, tone);

  return (
    <View
      style={[
        styles.tag,
        {
          backgroundColor: background,
          borderRadius: theme.radius.sm,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xxs,
        },
      ]}
    >
      <AppText variant="caption" color={foreground} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
  },
});
