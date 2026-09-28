# SmartFocus 2.0

SmartFocus uses smartphone behavioral data (app usage, pickups, notifications) and short self check-ins to help people understand patterns in their digital habits, focus and wellbeing.

This repository currently contains the **mobile frontend** (iOS and Android), built with React Native, Expo, TypeScript and Expo Router. By default it runs on realistic mock data, so it works without the backend (Node.js/Express, in `backend/` on the `backend` branch).

## Getting started

Requirements: Node.js 20+ and the [Expo Go](https://expo.dev/go) app on your phone (or an iOS Simulator / Android Emulator).

```sh
npm install
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

| Command             | What it does                         |
| ------------------- | ------------------------------------ |
| `npm start`         | Start the dev server                 |
| `npm run android`   | Open on a connected Android device   |
| `npm run ios`       | Open in the iOS Simulator (macOS)    |
| `npm run typecheck` | Run the TypeScript compiler          |

## Project structure

```
src/
├── app/            Routes (Expo Router). Keep these thin: they only render a screen.
│   ├── _layout.tsx         Root providers, status bar, navigation theme, sign-in guard
│   ├── sign-in.tsx         Sign in / create account
│   └── (tabs)/             Bottom tabs: Home, Insights, Activity, Check-In, Settings
├── features/       One folder per screen, plus components used only by that screen
├── components/
│   ├── ui/         Design-system building blocks (AppText, Button, Card, ListRow, ...)
│   └── data/       Data display (MetricTile, BarChart, CategoryBreakdown, InsightCard)
├── theme/          Design tokens (colors, typography, spacing) and ThemeProvider
├── services/       API layer: the only code that talks to the backend
├── mocks/          Mock backend responses used until the API exists
├── hooks/          useAsync (loading / error / refresh) and focus helpers
├── types/          Domain models, matching the backend's JSON
├── constants/      Shared display metadata (e.g. usage categories)
└── utils/          Formatting helpers (durations, dates)
```

**Rule of thumb:** routes → features → components → theme. Lower layers never import from higher ones.

## Design system

Everything visual comes from `src/theme`. Don't hard-code colors, font sizes or spacing in screens.

```tsx
import { StyleSheet } from 'react-native';
import { AppText, Card } from '@/components/ui';
import { useStyles, type Theme } from '@/theme';

export function Example() {
  const styles = useStyles(createStyles);
  return (
    <Card>
      <AppText variant="headline">Title</AppText>
      <AppText variant="callout" tone="secondary" style={styles.body}>Supporting text</AppText>
    </Card>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    body: { marginTop: theme.spacing.xs },
  });
```

- **Colors:** semantic tokens (`textSecondary`, `surface`, `primary`), with light and dark palettes. One accent color; status colors only where they carry meaning.
- **Typography:** system fonts (SF Pro / Roboto) on a fixed scale (`display`, `largeTitle`, `title`, `headline`, `body`, `callout`, `subhead`, `footnote`, `caption`). Respects OS text size up to 1.6×.
- **Spacing:** 4-pt scale (`xs` 4 … `huge` 48), 20pt screen gutter, 48pt minimum touch targets.
- **States:** wrap async content in `<AsyncContent>` to get consistent loading, empty and error (with retry) states.

## Adding a screen

1. Create `src/features/<name>/<Name>Screen.tsx` using `Screen`, `ScreenHeader` and `Section`.
2. Add a route file, e.g. `src/app/(tabs)/<name>.tsx`: `export { default } from '@/features/<name>/<Name>Screen';`
3. For a new tab, add it to the `TABS` list in `src/app/(tabs)/_layout.tsx`. For a detail screen, add a route outside `(tabs)` and navigate with `router.push`.

## Connecting the backend

All data flows through `src/services/smartfocusApi.ts`, which returns the types in `src/types/models.ts`.

1. Start the backend (see `backend/README.md`; it runs on port 3000).
2. Create a `.env` file:
   ```
   EXPO_PUBLIC_API_URL=http://<your-computer-LAN-IP>:3000
   EXPO_PUBLIC_USE_MOCK_DATA=false
   ```
3. Restart `npx expo start`. No screen code needs to change.

## Collecting phone data

The app doesn't read real usage data yet. [`docs/phone-data-collection.md`](docs/phone-data-collection.md) covers what Android and iOS allow, the approvals involved, and a phased plan.

## Sign-in

The app opens on a sign-in / create-account screen (`src/features/auth`) until someone signs in. `AuthProvider` keeps the session: the API token is stored with `expo-secure-store` on phones (`localStorage` on web), sent with every request by `src/services/http.ts`, and cleared if the server rejects it. The phone's time zone is sent at sign-in so "today" matches the user's clock. With mock data on, any email and password work.

The routes in `src/app/_layout.tsx` use `Stack.Protected`, so signed-out users can only reach `sign-in` and signed-in users can't go back to it.
