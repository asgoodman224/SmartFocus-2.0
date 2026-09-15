import { ActivityIndicator } from 'react-native';

import { useTheme } from '@/theme';

import { StateLayout } from './StateLayout';

export interface LoadingStateProps {
  message?: string;
  compact?: boolean;
}

export function LoadingState({ message, compact }: LoadingStateProps) {
  const { colors } = useTheme();

  return (
    <StateLayout
      compact={compact}
      icon={<ActivityIndicator color={colors.textTertiary} accessible accessibilityLabel="Loading" />}
      message={message}
    />
  );
}
