import { StyleSheet, View } from 'react-native';

import { getToneColors, useTheme, type Tone } from '@/theme';

import { Icon, type IconName } from './Icon';

export const ICON_BADGE_SIZE = 32;

export interface IconBadgeProps {
  name: IconName;
  tone?: Tone;
  /** Custom icon color (e.g. a category color) on a neutral background. Overrides `tone`. */
  color?: string;
}

/** A small icon in a tinted square. Used as the leading element of list rows and cards. */
export function IconBadge({ name, tone = 'neutral', color }: IconBadgeProps) {
  const theme = useTheme();
  const toneColors = getToneColors(theme.colors, tone);

  return (
    <View
      style={[
        styles.badge,
        {
          borderRadius: theme.radius.md,
          backgroundColor: color ? theme.colors.surfaceMuted : toneColors.background,
        },
      ]}
    >
      <Icon name={name} size={18} color={color ?? toneColors.foreground} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: ICON_BADGE_SIZE,
    height: ICON_BADGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
