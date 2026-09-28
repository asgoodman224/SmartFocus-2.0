import { forwardRef } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { MAX_FONT_SCALE, useStyles, useTheme, type Theme } from '@/theme';

import { AppText } from './AppText';

export interface TextFieldProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  label: string;
  /** Short help shown under the field, e.g. "At least 8 characters". */
  hint?: string;
  style?: StyleProp<ViewStyle>;
}

/** A labelled single-line text input. */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, hint, style, ...inputProps },
  ref,
) {
  const { colors } = useTheme();
  const styles = useStyles(createStyles);

  return (
    <View style={style}>
      <AppText variant="subhead" tone="secondary" style={styles.label}>
        {label}
      </AppText>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textTertiary}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        accessibilityLabel={label}
        accessibilityHint={hint}
        style={styles.input}
        {...inputProps}
      />
      {hint && (
        <AppText variant="caption" tone="tertiary" style={styles.hint}>
          {hint}
        </AppText>
      )}
    </View>
  );
});

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    label: {
      marginBottom: theme.spacing.xs,
    },
    input: {
      minHeight: theme.layout.minTouchTarget,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceMuted,
      color: theme.colors.textPrimary,
      fontSize: theme.typography.body.fontSize,
    },
    hint: {
      marginTop: theme.spacing.xs,
    },
  });
