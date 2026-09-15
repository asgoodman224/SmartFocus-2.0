import type { IconName } from '@/components/ui/Icon';
import type { UsageCategory } from '@/types/models';

/** Display metadata for app-usage categories. Colors live in the theme (`colors.category`). */
export const CATEGORY_META: Record<UsageCategory, { label: string; icon: IconName }> = {
  productivity: { label: 'Productivity', icon: 'briefcase-outline' },
  communication: { label: 'Communication', icon: 'chatbubble-outline' },
  social: { label: 'Social', icon: 'people-outline' },
  entertainment: { label: 'Entertainment', icon: 'play-circle-outline' },
  other: { label: 'Other', icon: 'ellipsis-horizontal-circle-outline' },
};
