import { Platform, Switch, type SwitchProps } from 'react-native';

import { useTheme } from '@/theme';

export interface ToggleProps extends Omit<SwitchProps, 'trackColor' | 'thumbColor' | 'ios_backgroundColor'> {
  /** Required: switches usually sit next to a visible label that screen readers can't associate. */
  accessibilityLabel: string;
}

/** The native switch, styled with theme colors. */
export function Toggle(props: ToggleProps) {
  const { colors } = useTheme();

  return (
    <Switch
      trackColor={{ false: colors.borderStrong, true: colors.primary }}
      thumbColor={Platform.OS === 'android' ? colors.surface : undefined}
      ios_backgroundColor={colors.borderStrong}
      {...props}
    />
  );
}
