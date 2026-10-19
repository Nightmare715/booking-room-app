# Study Room Booking

A cross-platform campus study-room and lab booking app built with React Native
and Expo. Browse and filter rooms, check availability by date and time, and
manage bookings from a mobile device or the web.

## Features

- Firebase email/password sign-up, sign-in, and password reset.
- Search rooms by name or building; filter by availability and minimum capacity.
- View room photos, location, capacity, and remaining seats.
- Select a date and time slot and create a booking with duplicate-booking and
  room-capacity conflict checks.
- Review and cancel bookings, show a booking QR code, and request an extension
  for a booking in progress.
- In-app booking notifications and profile editing.
- Stack and bottom-tab navigation with typed route parameters.
- Zustand with AsyncStorage persistence for client booking state.
- TanStack Query for room data, plus pull-to-refresh on the room list.
- Animated room cards and safe-area-aware layouts.

## Tech stack

- React Native 0.86 and Expo SDK 57 (managed workflow)
- TypeScript with strict mode
- React Navigation 7 (native stack and bottom tabs)
- Zustand 5 and TanStack Query 5
- Firebase Authentication, Cloud Firestore, and Cloud Functions
- React Native Gesture Handler and Reanimated

## Requirements

- Node.js LTS and npm
- Expo Go on an Android/iOS device for a quick mobile preview, or an Android
  emulator / iOS simulator
- A Firebase project configured for this app
- Firebase CLI only if you need to deploy or run the Cloud Functions

## Install and run

From the project root:

```sh
npm install
npx expo start
```

Scan the Expo Go QR code with your phone, or press the appropriate key in the
Expo terminal to open an Android emulator. The iOS simulator requires macOS
with Xcode. To run a specific target:

```sh
npm run android
npm run ios
npm run web
```

The web version is useful for previewing the interface. It does not replace
testing the React Native app on a phone or emulator.

## Firebase setup

The app uses Firebase client configuration in
[`src/config/firebase.ts`](./src/config/firebase.ts). To run the project with
your own Firebase project:

1. Create a Firebase project and register a web app to obtain its Firebase
   client configuration.
2. Enable **Email/Password** under Firebase Authentication sign-in providers.
3. Create a Cloud Firestore database and configure Firestore security rules
   appropriate for authenticated users, rooms, bookings, and notifications.
4. Replace the client configuration values in `src/config/firebase.ts` with
   the values for your Firebase project.
5. If using booking check-in, booking extensions, or scheduled reminders,
   select your Firebase project with the Firebase CLI, install the Functions
   dependencies, and deploy the functions:

   ```sh
   npm install -g firebase-tools
   firebase login
   firebase use <your-firebase-project-id>
   npm install --prefix functions
   firebase deploy --only functions
   ```

   Cloud Functions and scheduled functions may require a billing-enabled
   Firebase plan. Scheduled reminders also require the Cloud Scheduler
   prerequisites described in
   [`docs/notifications-setup.md`](./docs/notifications-setup.md).

Firebase client configuration is included in the mobile/web app and is not a
substitute for Firestore security rules. Never commit service-account keys,
admin credentials, passwords, or other private secrets to this repository.
The default room list is seeded into Firestore when the collection is empty.

## Validation

Check TypeScript:

```sh
npx tsc --noEmit
```

Export a production web bundle to `dist`:

```sh
npx expo export --platform web
```

Export an Android JavaScript bundle for validation:

```sh
npx expo export --platform android
```

The Android export is not an installable APK. Create an APK/AAB separately
with an appropriate Expo/EAS build profile if a standalone Android package is
required.

## Project structure

```text
src/
  components/   Reusable room, search, filter, and notification UI
  config/       Firebase client configuration
  context/      App-level actions and shared state integration
  data/         Default room seed data
  navigation/   Typed stack and bottom-tab navigators
  screens/      Authentication, room browsing, bookings, profile, notifications
  services/     Firestore room, booking, and notification operations
  stores/       Persisted Zustand booking store
  types/        Shared TypeScript types
functions/      Firebase Cloud Functions
docs/           Additional setup notes
```
