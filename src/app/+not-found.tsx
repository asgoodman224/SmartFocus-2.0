import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { EmptyState, Screen } from '@/components/ui';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <Screen scroll={false} contentContainerStyle={styles.center}>
      <EmptyState
        icon="compass-outline"
        title="Page not found"
        message="This screen doesn't exist or has moved."
        actionLabel="Go to Home"
        onAction={() => router.replace('/')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
  },
});
