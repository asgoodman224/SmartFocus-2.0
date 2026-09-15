import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText, Button, Card, Divider } from '@/components/ui';
import { api, ApiError } from '@/services';
import { MAX_FONT_SCALE, useStyles, useTheme, type Theme } from '@/theme';
import type { CheckIn, Rating } from '@/types/models';

import { RatingScale } from './RatingScale';

const NOTE_MAX_LENGTH = 280;

const QUESTIONS = [
  { key: 'mood', label: 'Mood', lowLabel: 'Low', highLabel: 'Great' },
  { key: 'energy', label: 'Energy', lowLabel: 'Drained', highLabel: 'Energized' },
  { key: 'focus', label: 'Focus', lowLabel: 'Scattered', highLabel: 'Sharp' },
] as const;

type RatingKey = (typeof QUESTIONS)[number]['key'];

export interface CheckInFormProps {
  onSaved: (checkIn: CheckIn) => void;
}

export function CheckInForm({ onSaved }: CheckInFormProps) {
  const { colors } = useTheme();
  const styles = useStyles(createStyles);

  const [ratings, setRatings] = useState<Partial<Record<RatingKey, Rating>>>({});
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();

  const isComplete = QUESTIONS.every((q) => ratings[q.key] !== undefined);

  async function handleSave() {
    const { mood, energy, focus } = ratings;
    if (!mood || !energy || !focus) return;

    setIsSaving(true);
    setError(undefined);
    try {
      const checkIn = await api.createCheckIn({ mood, energy, focus, note: note.trim() || undefined });
      onSaved(checkIn);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Your check-in could not be saved. Please try again.',
      );
      setIsSaving(false);
    }
  }

  return (
    <Card padding="xl">
      {QUESTIONS.map((question, index) => (
        <View key={question.key}>
          {index > 0 && <Divider style={styles.divider} />}
          <RatingScale
            label={question.label}
            lowLabel={question.lowLabel}
            highLabel={question.highLabel}
            value={ratings[question.key]}
            onChange={(value) => setRatings((current) => ({ ...current, [question.key]: value }))}
          />
        </View>
      ))}

      <Divider style={styles.divider} />

      <View style={styles.noteHeader}>
        <AppText variant="headline">Note</AppText>
        <AppText variant="subhead" tone="tertiary">
          Optional
        </AppText>
      </View>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Anything affecting your day?"
        placeholderTextColor={colors.textTertiary}
        multiline
        maxLength={NOTE_MAX_LENGTH}
        textAlignVertical="top"
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        accessibilityLabel="Note, optional"
        style={styles.input}
      />
      <AppText variant="caption" tone="tertiary" align="right" style={styles.counter}>
        {note.length}/{NOTE_MAX_LENGTH}
      </AppText>

      {error && (
        <AppText variant="footnote" tone="danger" accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </AppText>
      )}

      <Button
        title="Save check-in"
        onPress={handleSave}
        disabled={!isComplete}
        loading={isSaving}
        fullWidth
        style={styles.submit}
      />
      {!isComplete && (
        <AppText variant="footnote" tone="tertiary" align="center" style={styles.hint}>
          Rate all three to save.
        </AppText>
      )}
    </Card>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    divider: {
      marginVertical: theme.spacing.lg,
    },
    noteHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    input: {
      minHeight: 96,
      marginTop: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceMuted,
      color: theme.colors.textPrimary,
      fontSize: theme.typography.callout.fontSize,
    },
    counter: {
      marginTop: theme.spacing.xs,
    },
    error: {
      marginTop: theme.spacing.md,
    },
    submit: {
      marginTop: theme.spacing.lg,
    },
    hint: {
      marginTop: theme.spacing.sm,
    },
  });
