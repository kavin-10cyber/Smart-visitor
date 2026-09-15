# Agent Guidelines & Repository Constraints

## Dual-Platform Compatibility Mandate (Android & iOS)
This project is deployed to both **Android** and **iOS** mobile platforms.

- **Cross-Platform Compatibility**: Every code change, UI component, hook, and native module edit MUST be tested and written for both Android and iOS compatibility.
- **Platform Branching**: Use `Platform.OS === 'ios'` or `Platform.select()` for any platform-specific UI nuances (e.g. `KeyboardAvoidingView`, safe area padding, status bar styling).
- **Native Modules**: Any native module registered on Android (in `mobile/android/`) must maintain an equivalent native implementation on iOS (in `mobile/ios/SmartVisitor/`) with identical method names and argument contracts.
- **Privacy & Permissions**: Keep both `mobile/android/app/src/main/AndroidManifest.xml` and `mobile/ios/SmartVisitor/Info.plist` synchronized with all required camera, storage, and photo permissions.
