# Cross-Platform (Android & iOS) Development Guidelines

All code and features in this application must be strictly compatible with **both Android and iOS**.

## Rules & Behavioral Constraints
1. **Never use platform-exclusive APIs without cross-platform alternatives:**
   - Always branch via `Platform.OS === 'ios'` or `Platform.select({ ios: ..., android: ... })` when platform-specific behavior is required.
   - For native permissions, implement both Android runtime permissions (`PermissionsAndroid`) and iOS `Info.plist` usage descriptions / library checks.
2. **Keyboard & Screen Form Factors:**
   - Forms and modals with text inputs must always incorporate `KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : undefined}`.
   - Always ensure SafeArea padding (notch and bottom home indicator bar) is respected:
     - Header padding top for status bar / Dynamic Island.
     - Modal bottom padding for home indicator (`paddingBottom: Platform.OS === 'ios' ? 34 : 20`).
3. **Native Modules & Capabilities:**
   - Any native module implemented for Android (Kotlin/Java) must have a corresponding iOS equivalent (Objective-C/Swift) under `ios/SmartVisitor/`.
   - The method signatures, promise resolutions, and parameter types must match exactly so JavaScript callers operate seamlessly on both platforms.
4. **Dependencies:**
   - When adding new third-party React Native libraries, verify that CocoaPods (`.podspec`) and Gradle build configs are supported and functional on both platforms.
   - Run `npm run ios` and `npm run android` validation whenever adding native packages.
