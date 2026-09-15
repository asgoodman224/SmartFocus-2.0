import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useStyles, useTheme, type Theme } from '@/theme';

export interface ScreenProps {
  children: ReactNode;
  /** Set false for screens that manage their own scrolling (e.g. a FlatList). */
  scroll?: boolean;
  /** Enables pull-to-refresh when provided. */
  onRefresh?: () => void;
  refreshing?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * Root container for every tab screen: safe-area insets, background color,
 * consistent gutters, a max content width for large phones, and optional
 * pull-to-refresh. The tab bar handles the bottom inset.
 */
export function Screen({
  children,
  scroll = true,
  onRefresh,
  refreshing = false,
  contentContainerStyle,
}: ScreenProps) {
  const { colors } = useTheme();
  const styles = useStyles(createStyles);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.textTertiary}
                colors={[colors.primary]}
                progressBackgroundColor={colors.surface}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, contentContainerStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      width: '100%',
      maxWidth: theme.layout.maxContentWidth,
      alignSelf: 'center',
      paddingHorizontal: theme.layout.screenGutter,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
    },
    fill: {
      flex: 1,
    },
  });
