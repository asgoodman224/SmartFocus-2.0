import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export interface DividerProps {
  /** Left inset, e.g. to align with text that follows an icon. */
  inset?: number;
  style?: StyleProp<ViewStyle>;
}

export function Divider({ inset = 0, style }: DividerProps) {
  const { colors, layout } = useTheme();

  return (
    <View
      style={[{ height: layout.hairline, backgroundColor: colors.border, marginLeft: inset }, style]}
    />
  );
}
