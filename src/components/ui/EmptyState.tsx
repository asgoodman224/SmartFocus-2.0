import { Button } from './Button';
import type { IconName } from './Icon';
import { StateIcon, StateLayout } from './StateLayout';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  /** Explain why it's empty and what will fill it. */
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  actionLabel,
  onAction,
  compact,
}: EmptyStateProps) {
  return (
    <StateLayout
      compact={compact}
      icon={<StateIcon name={icon} />}
      title={title}
      message={message}
      action={
        actionLabel && onAction ? (
          <Button title={actionLabel} onPress={onAction} variant="secondary" size="sm" />
        ) : undefined
      }
    />
  );
}
