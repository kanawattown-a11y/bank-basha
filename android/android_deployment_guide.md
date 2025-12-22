# Bank Basha Android App Deployment Guide

This folder (`android/`) contains a complete Android Studio project for the Bank Basha application. The app currently wraps your website (`https://bankbasha.com`) in a native specialized browser (WebView) with added native features like Camera access, Push Notifications, and File Downloads.

## 1. Prerequisites
- **Android Studio**: Install the latest version (Ladybug or newer recommended).
- **JDK 17**: Android Studio usually comes with this bundled.

## 2. Opening the Project
1. Open Android Studio.
2. Select **Open**.
3. Navigate to the `android/` folder inside your project root and click **OK**.
4. Android Studio will start "Syncing Gradle". Wait for this to finish. It may take a few minutes to download dependencies.

## 3. Configuration (Important!)
Before building, you may need to update a few things:

### A. Domain Name
If your domain changes from `bankbasha.com`, open `app/src/main/java/com/bankbasha/app/MainActivity.kt` and update:
```kotlin
val startUrl = "https://bankbasha.com" 
```
Also update `AndroidManifest.xml` deep link section.

### B. Firebase / Push Notifications
To make Push Notifications work, you MUST add your Firebase configuration file:
1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Create a new Android App with package name: `com.bankbasha.app`.
3. Download `google-services.json`.
4. Place this file in `android/app/google-services.json`.
   
   **Without this file, the build might fail or notifications will not work.**

## 4. Building & Running (Testing)
1. Connect your Android device via USB (Enable Developer Options > USB Debugging).
2. Or create an Emulator in Android Studio (AVD Manager).
3. Click the green **Run (Play)** button in the top toolbar.

## 5. Generating Signed APK (For Play Store or Distribution)
To release the app to users, you need a Signed Bundle (AAB) or APK.

1. Go to **Build** menu > **Generate Signed Bundle / APK**.
2. Select **Android App Bundle** (for Play Store) or **APK** (for direct download).
3. Click **Next**.
4. Under **Key store path**, click **Create new...**
   - Choose a location to save your `.jks` file (keep it safe!).
   - Set a password.
   - Fill in the certificate details (First Name, Org Name, etc.).
5. Click **Next**.
6. Select **release** build variant.
7. Click **Create** (or Finish).

The file will be generated in `android/app/release/`.

## 6. Features Implemented
- **WebView**: Full support for your web app.
- **Swipe to Refresh**: Pull down to reload the page.
- **Camera/File Upload**: Works for KYC selfie and ID upload.
- **Downloads**: Download statements PDFs directly to `Downloads` folder.
- **Deep Links**: Links to `bankbasha.com` open directly in this app.
- **FCM**: Background Push Notification support.

## Troubleshooting
- **"google-services.json missing"**: Ensure you downloaded it from Firebase and placed it in `android/app/`.
- **Camera crashes**: Ensure you added the permissions logic (already included in `MainActivity.kt`).
- **Uploads not working**: Check `AndroidManifest.xml` for `FileProvider` setup (already included).
- **"resource mipmap/ic_launcher not found"**: This means the app icons are missing. The easiest way to fix this is using **Android Studio's Image Asset Studio**:
    1. In Android Studio, right-click on the `app` folder (in the Project view).
    2. Go to **New** > **Image Asset**.
    3. In the "Icon Type" dropdown, select **Launcher Icons (Adaptive and Legacy)**.
    4. **Foreground Layer**:
       - Asset Type: Select **Image**.
       - Path: Choose your logo file (Recommended size: **512x512 pixels**).
       - Resize the layer using the slider so it fits within the "safe zone" (the circle).
    5. **Background Layer**:
       - Asset Type: Select **Color**.
       - Color: Choose a background color (e.g., `#0F172A` to match your dark theme, or White).
    6. Click **Next**, then **Finish**.
    
    This will automatically generate all the necessary icon files (`ic_launcher.png`, `ic_launcher_round.png`, etc.) in all the correct sizes.
