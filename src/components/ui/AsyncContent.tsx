import type { ReactNode } from 'react';

import type { AsyncState } from '@/hooks/useAsync';
import { ApiError } from '@/services/http';

import { EmptyState, type EmptyStateProps } from './EmptyState';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';

export interface AsyncContentProps<T> {
  state: Pick<AsyncState<T>, 'data' | 'error' | 'isLoading' | 'reload'>;
  /** Rendered once data has loaded. */
  children: (data: T) => ReactNode;
  /** Return true to show `emptyState` instead of `children`. */
  isEmpty?: (data: T) => boolean;
  emptyState?: Omit<EmptyStateProps, 'compact'>;
  errorTitle?: string;
  compact?: boolean;
}

/**
 * Picks the right UI for an async request: loading, error (with retry), empty,
 * or the content itself. Keeps every screen's state handling consistent.
 *
 *   <AsyncContent state={summary}>
 *     {(data) => <TodaySummaryCard summary={data} />}
 *   </AsyncContent>
 */
export function AsyncContent<T>({
  state,
  children,
  isEmpty,
  emptyState,
  errorTitle,
  compact = true,
}: AsyncContentProps<T>) {
  if (state.isLoading) {
    return <LoadingState compact={compact} />;
  }

  if (state.error) {
    // Only API errors carry messages written for users; hide internal error text.
    const message = state.error instanceof ApiError ? state.error.message : undefined;
    return <ErrorState title={errorTitle} message={message} onRetry={state.reload} compact={compact} />;
  }

  if (state.data === undefined) {
    return <LoadingState compact={compact} />;
  }

  if (emptyState && isEmpty?.(state.data)) {
    return <EmptyState {...emptyState} compact={compact} />;
  }

  return <>{children(state.data)}</>;
}
