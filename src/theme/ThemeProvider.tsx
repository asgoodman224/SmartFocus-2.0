import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { palettes, type ColorScheme, type Palette } from './colors';
import { layout, radius, spacing } from './spacing';
import { typography } from './typography';

export type ThemePreference = 'system' | ColorScheme;

export interface Theme {
  scheme: ColorScheme;
  colors: Palette;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  layout: typeof layout;
}

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  // TODO: persist this (AsyncStorage or the user's profile) once settings are saved.
  const [preference, setPreference] = useState<ThemePreference>('system');

  const scheme: ColorScheme =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: { scheme, colors: palettes[scheme], typography, spacing, radius, layout },
      preference,
      setPreference,
    }),
    [scheme, preference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('Theme hooks must be used inside <ThemeProvider>.');
  }
  return context;
}

/** The active theme tokens (colors, typography, spacing, radius, layout). */
export function useTheme(): Theme {
  return useThemeContext().theme;
}

/** Read or change the light/dark preference. Used by Settings. */
export function useThemePreference() {
  const { preference, setPreference } = useThemeContext();
  return { preference, setPreference };
}

/**
 * Builds themed styles. Define the factory outside the component so it is
 * stable between renders:
 *
 *   const createStyles = (theme: Theme) => StyleSheet.create({ ... });
 *
 *   function MyComponent() {
 *     const styles = useStyles(createStyles);
 *   }
 */
export function useStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
