# Board Meeting - iOS App Store Submission Guide

This guide walks you through submitting Board Meeting to the Apple App Store.

---

## Prerequisites

1. **Apple Developer Account** - Sign up at [developer.apple.com](https://developer.apple.com) ($99/year)
2. **Mac computer** with macOS Ventura or later
3. **Xcode 15+** installed from the Mac App Store
4. **This project downloaded** to your Mac

---

## Step 1: Download and Set Up the Project

1. Download/clone this entire project to your Mac
2. Open Terminal and navigate to the project folder
3. Run the following commands:

```bash
# Install dependencies
npm install

# Build the web app
npm run build

# Sync with iOS
npx cap sync ios
```

---

## Step 2: Open in Xcode

```bash
npx cap open ios
```

This opens `ios/App/App.xcworkspace` in Xcode.

**Important:** Always open the `.xcworkspace` file, NOT the `.xcodeproj` file.

---

## Step 3: Configure Signing

1. In Xcode, select the **App** project in the left sidebar
2. Select the **App** target
3. Go to the **Signing & Capabilities** tab
4. Check **Automatically manage signing**
5. Select your **Team** (your Apple Developer account)
6. If prompted, let Xcode create a provisioning profile

---

## Step 4: Update Version Number

1. Still in the **General** tab of your target
2. Set **Version** to `1.0.0`
3. Set **Build** to `1`

For future updates, increment these numbers.

---

## Step 5: Generate App Icons

Your logo is at: `attached_assets/IMG_3950_1769110363136.jpeg`

**Option A: Use an online generator**
1. Go to [appicon.co](https://appicon.co) or [makeappicon.com](https://makeappicon.com)
2. Upload your logo image
3. Download the generated icon set
4. Replace the contents of `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

**Option B: Use Xcode**
1. In Xcode, open `Assets.xcassets`
2. Select `AppIcon`
3. Drag your 1024x1024 image to the appropriate slots
4. Xcode will warn you if any sizes are missing

Required sizes: 20, 29, 40, 60, 76, 83.5, 1024 (in various @1x, @2x, @3x scales)

---

## Step 6: Test on a Real Device

1. Connect your iPhone to your Mac
2. Select your device from the device dropdown in Xcode
3. Press **Cmd + R** to build and run
4. Test all features thoroughly:
   - Login/signup
   - Profile editing
   - Buddy matching (swipe)
   - Surf reports
   - Trips
   - Marketplace
   - Messages

---

## Step 7: Create App Store Connect Listing

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps** → **+** → **New App**
3. Fill in:
   - **Platform:** iOS
   - **Name:** Board Meeting
   - **Primary Language:** English
   - **Bundle ID:** app.boardmeeting.mobile
   - **SKU:** boardmeeting001 (any unique identifier)
   - **User Access:** Full Access

---

## Step 8: Fill in App Information

Use the content from `APP_STORE_ASSETS.md`:

**App Store Tab:**
- Promotional Text (short description)
- Description (full description)
- Keywords
- Support URL
- Marketing URL

**Pricing and Availability:**
- Price: Free (with in-app purchases for Premium)
- Availability: All countries or select specific ones

---

## Step 9: Upload Screenshots

Capture screenshots on these devices (or simulators):
- iPhone 15 Pro Max (6.7")
- iPhone 14 Plus (6.5")  
- iPhone 8 Plus (5.5")
- iPad Pro 12.9" (optional)

**Recommended screenshots:**
1. Home feed showing posts
2. Buddy matching (swipe interface)
3. Surf reports with forecast
4. Trip planning screen
5. Marketplace listings
6. Profile page with stats

**Tips:**
- Use Xcode Simulator for consistent screenshots
- Hide the status bar or use a clean status bar
- Screenshots must be PNG or JPEG

---

## Step 10: Archive and Upload

1. In Xcode, select **Any iOS Device** as the build target
2. Go to **Product** → **Archive**
3. Wait for the archive to complete
4. The Organizer window will open
5. Select your archive and click **Distribute App**
6. Choose **App Store Connect** → **Upload**
7. Follow the prompts to upload

---

## Step 11: Submit for Review

1. Back in App Store Connect, your build will appear in the **Build** section
2. Select the build you uploaded
3. Fill in any remaining required fields
4. Answer the export compliance questions:
   - "Does your app use encryption?" → **No** (we set ITSAppUsesNonExemptEncryption to false)
5. Answer the content rights questions
6. Click **Submit for Review**

---

## Step 12: Wait for Apple Review

- Review typically takes **1-2 business days**
- You'll receive email updates on the status
- If rejected, Apple will provide specific reasons and you can resubmit

---

## Common Issues and Fixes

### "Missing Push Notification Entitlement"
If your app uses push notifications, enable them in Signing & Capabilities.

### "Missing Privacy Policy"
You MUST have a privacy policy URL. Create one at your website or use a generator.

### "App crashes on launch"
Test thoroughly on a real device before submitting. Check Xcode console for errors.

### "Screenshots wrong size"
Use the exact device simulators or real devices listed in App Store Connect.

---

## After Approval

Once approved, your app will be live on the App Store!

**Post-launch tasks:**
- Monitor crash reports in App Store Connect
- Respond to user reviews
- Plan updates based on feedback
- Consider App Store Optimization (ASO) for better visibility

---

## Updating the App

For future updates:

1. Make your changes in the code
2. Run `npm run build && npx cap sync ios`
3. Increment the version/build number
4. Archive and upload to App Store Connect
5. Submit the new version for review

---

## Need Help?

- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
