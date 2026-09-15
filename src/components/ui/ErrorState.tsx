import { Button } from './Button';
import { StateIcon, StateLayout } from './StateLayout';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({
  title = "Couldn't load this",
  message = 'Check your connection and try again.',
  onRetry,
  compact,
}: ErrorStateProps) {
  return (
    <StateLayout
      compact={compact}
      icon={<StateIcon name="cloud-offline-outline" />}
      title={title}
      message={message}
      action={
        onRetry ? (
          <Button title="Try again" onPress={onRetry} variant="secondary" size="sm" icon="refresh" />
        ) : undefined
      }
    />
  );
}
