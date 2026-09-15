import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export interface TouchableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Style applied while pressed on iOS and web. Android shows a ripple instead. */
  pressedStyle?: StyleProp<ViewStyle>;
}

const DEFAULT_PRESSED_STYLE: ViewStyle = { opacity: 0.7 };

/**
 * Base for every tappable element, so press feedback is consistent and
 * platform-appropriate: a ripple on Android, a subtle highlight on iOS.
 * Give it `overflow: 'hidden'` when it has rounded corners so the ripple is clipped.
 */
export function Touchable({
  style,
  pressedStyle = DEFAULT_PRESSED_STYLE,
  android_ripple,
  ...rest
}: TouchableProps) {
  const { colors } = useTheme();
  const usesRipple = Platform.OS === 'android';

  return (
    <Pressable
      android_ripple={android_ripple ?? { color: colors.pressedOverlay, foreground: true }}
      style={({ pressed }) => [style, pressed && !usesRipple && pressedStyle]}
      {...rest}
    />
  );
}
