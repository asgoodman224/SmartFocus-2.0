import { Tabs } from 'expo-router';

import { Icon, type IconName } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * Bottom tabs. `name` must match a file in this folder (index.tsx is Home).
 * To add a tab: create the route file, then add an entry here.
 */
const TABS: { name: string; title: string; icon: IconName; selectedIcon: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', selectedIcon: 'home' },
  { name: 'insights', title: 'Insights', icon: 'bulb-outline', selectedIcon: 'bulb' },
  { name: 'activity', title: 'Activity', icon: 'bar-chart-outline', selectedIcon: 'bar-chart' },
  { name: 'check-in', title: 'Check-In', icon: 'checkmark-circle-outline', selectedIcon: 'checkmark-circle' },
  { name: 'settings', title: 'Settings', icon: 'settings-outline', selectedIcon: 'settings' },
];

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused }) => (
              <Icon name={focused ? tab.selectedIcon : tab.icon} size={24} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
