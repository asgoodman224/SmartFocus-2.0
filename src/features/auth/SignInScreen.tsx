import { useRef, useState } from 'react';
import { StyleSheet, type TextInput } from 'react-native';

import { AppText, Button, Card, Screen, ScreenHeader, TextField } from '@/components/ui';
import { ApiError } from '@/services';
import { USE_MOCK_DATA } from '@/services/config';
import { useStyles, type Theme } from '@/theme';

import { useAuth } from './AuthProvider';

const MIN_PASSWORD_LENGTH = 8;

type Mode = 'signIn' | 'signUp';

const COPY: Record<Mode, { title: string; subtitle: string; submit: string; switchTo: string }> = {
  signIn: {
    title: 'Welcome back',
    subtitle: 'Sign in to see your focus, phone habits and check-ins.',
    submit: 'Sign in',
    switchTo: 'New to SmartFocus? Create an account',
  },
  signUp: {
    title: 'Create your account',
    subtitle: 'SmartFocus helps you see how your phone habits relate to your focus and mood.',
    submit: 'Create account',
    switchTo: 'Already have an account? Sign in',
  },
};

export default function SignInScreen() {
  const styles = useStyles(createStyles);
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const passwordRef = useRef<TextInput>(null);

  const copy = COPY[mode];
  const emailLooksValid = /^\S+@\S+\.\S+$/.test(email.trim());
  const passwordValid =
    mode === 'signIn' ? password.length > 0 : password.length >= MIN_PASSWORD_LENGTH;
  const canSubmit = emailLooksValid && passwordValid && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(undefined);
    try {
      await (mode === 'signIn' ? signIn : signUp)(email.trim(), password);
      // Signed in: the root layout swaps this screen for the app.
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  }

  function switchMode() {
    setMode(mode === 'signIn' ? 'signUp' : 'signIn');
    setError(undefined);
  }

  return (
    <Screen>
      <ScreenHeader eyebrow="SmartFocus" title={copy.title} subtitle={copy.subtitle} />

      <Card padding="xl">
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          submitBehavior="submit"
        />
        <TextField
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
          textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
          hint={mode === 'signUp' ? `At least ${MIN_PASSWORD_LENGTH} characters` : undefined}
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
          style={styles.field}
        />

        {error && (
          <AppText variant="footnote" tone="danger" accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </AppText>
        )}

        <Button
          title={copy.submit}
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={isSubmitting}
          fullWidth
          style={styles.submit}
        />
      </Card>

      <Button title={copy.switchTo} variant="ghost" size="sm" onPress={switchMode} style={styles.switch} />

      {USE_MOCK_DATA && (
        <AppText variant="footnote" tone="tertiary" align="center" style={styles.note}>
          Sample data mode: any email and password will work.
        </AppText>
      )}
    </Screen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    field: {
      marginTop: theme.spacing.lg,
    },
    error: {
      marginTop: theme.spacing.md,
    },
    submit: {
      marginTop: theme.spacing.xl,
    },
    switch: {
      marginTop: theme.spacing.lg,
      alignSelf: 'center',
    },
    note: {
      marginTop: theme.spacing.md,
    },
  });
