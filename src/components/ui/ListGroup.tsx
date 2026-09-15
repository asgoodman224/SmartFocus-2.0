import { Children, Fragment, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { Card } from './Card';
import { Divider } from './Divider';
import { ICON_BADGE_SIZE } from './IconBadge';

export interface ListGroupProps {
  children: ReactNode;
  /**
   * Where dividers start: 'icon' aligns with row text after a leading icon,
   * 'text' aligns with rows that have no icon, 'none' spans the full width.
   */
  inset?: 'icon' | 'text' | 'none';
  style?: StyleProp<ViewStyle>;
}

/** A card of rows with dividers inserted automatically between them. */
export function ListGroup({ children, inset = 'icon', style }: ListGroupProps) {
  const { spacing } = useTheme();
  const items = Children.toArray(children);

  const insetWidth = {
    icon: spacing.lg + ICON_BADGE_SIZE + spacing.md,
    text: spacing.lg,
    none: 0,
  }[inset];

  return (
    <Card padding="none" style={style}>
      {items.map((child, index) => (
        <Fragment key={index}>
          {index > 0 && <Divider inset={insetWidth} />}
          {child}
        </Fragment>
      ))}
    </Card>
  );
}
