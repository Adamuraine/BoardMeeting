# SurfTribe - App Store Submission Materials

## App Information

**App Name:** SurfTribe  
**Subtitle:** Connect. Surf. Explore Together  
**Category:** Primary: Social Networking | Secondary: Sports  
**Age Rating:** 12+ (Infrequent/Mild Social Networking)

---

## App Description (4000 character limit)

**Short Version (Promotional Text - 170 chars):**
Find your perfect surf buddy, check live conditions, and plan epic trips together. The social app built by surfers, for surfers.

**Full Description:**

SurfTribe is the ultimate social platform for surfers who want to connect, share, and explore the waves together.

**FIND YOUR SURF TRIBE**
Match with fellow surfers using our Tinder-style buddy system. Swipe right on surfers who share your vibe, skill level, and wave preferences. When you both match, you're connected and ready to paddle out together.

**LIVE SURF CONDITIONS**
Never miss a good swell again. Check real-time surf reports including wave height, wind speed, water temperature, and tide information. Premium members get extended 14-day forecasts to plan ahead.

**PLAN EPIC SURF TRIPS**
Create and organize surf trips with your buddies. Set your destination, dates, wave preferences, and vibe. Invite friends, manage expenses, and coordinate everything in one place. Track shared costs like accommodation and transport, with airfare calculated separately.

**TRACK YOUR PROGRESS**
Log your sessions and watch your skills grow. Record your biggest waves, fastest rides, and longest sessions. Unlock trick badges and share your achievements with the community.

**SHARE THE STOKE**
Post your best moments to the social feed. Share photos from your sessions, tag your location, and connect with the global surf community.

**PREMIUM FEATURES**
Upgrade to Premium for:
- 14-day extended surf forecasts
- Unlimited buddy swipes
- Broadcast your trips to attract more surfers
- Priority matching

Whether you're a beginner looking for patient surf buddies or an experienced charger seeking adventure partners, SurfTribe helps you find your people.

Download now and join the tribe!

---

## Keywords (100 character limit)

```
surf,surfing,waves,ocean,beach,buddy,friends,forecast,swell,trips,social,surfer,paddle,stoke,tribe
```

---

## What's New (Version 1.0)

```
Welcome to SurfTribe! 

- Match with surfers who share your vibe
- Check live surf conditions and forecasts
- Plan and organize surf trips with friends
- Track your sessions and unlock achievements
- Share photos and connect with the community

Paddle out and find your tribe!
```

---

## Screenshot Suggestions

You'll need 6.7" (iPhone 14 Pro Max) and 6.5" (iPhone 11 Pro Max) screenshots.

**Recommended Screenshots (in order):**

1. **Buddy Matching Screen** - Show the swipe interface with a surfer profile
   - Caption: "Find Your Perfect Surf Buddy"

2. **Surf Conditions Screen** - Display the forecast with wave height and conditions
   - Caption: "Live Surf Reports & Forecasts"

3. **Trip Planning Screen** - Show a trip with participants and details
   - Caption: "Plan Epic Surf Adventures"

4. **Profile/Stats Screen** - Display achievements and trick badges
   - Caption: "Track Your Progress"

5. **Social Feed Screen** - Show the photo feed with posts
   - Caption: "Share the Stoke"

6. **Messages Screen** - Show conversations with buddies
   - Caption: "Connect with Your Tribe"

---

## App Icon Requirements

Required sizes (all from your logo):
- 1024x1024 (App Store)
- 180x180 (iPhone @3x)
- 120x120 (iPhone @2x)
- 167x167 (iPad Pro)
- 152x152 (iPad @2x)

**Tip:** Use an app icon generator like AppIcon.co - upload your logo once and it generates all sizes.

---

## Privacy Policy URL

You'll need a privacy policy. You can:
1. Use a generator like termly.io or privacypolicies.com
2. Host it at: surftribe.app/privacy

**Key points to include:**
- Data collected (profile info, location for surf spots, photos)
- How data is used (matching, trip planning, social features)
- Third-party services (Stripe for payments, Stormglass for forecasts)
- Data retention and deletion options

---

## Support URL

Create a simple support page or use: surftribe.app/support

Include:
- Contact email
- FAQ section
- How to delete account

---

## App Review Notes

```
Test Account:
- The app uses Replit Auth for login
- You can test the app at: https://surftribesocial.replit.app
- All features are functional with sample data

In-App Purchases:
- $5/month Premium subscription via Stripe
- Provides extended forecasts and unlimited swipes
```

---

## Checklist Before Submission

- [ ] Apple Developer Account ($99/year)
- [ ] App icons generated (all sizes)
- [ ] Screenshots captured (both device sizes)
- [ ] Privacy policy URL live
- [ ] Support URL live  
- [ ] Test the iOS build in Xcode simulator
- [ ] Configure app signing in Xcode
- [ ] Create app listing in App Store Connect
- [ ] Upload build via Xcode
- [ ] Submit for review

---

## Build Commands (Run on Mac)

```bash
# Install dependencies
npm install

# Build the web app and sync to iOS
npm run build && npx cap sync ios

# Open in Xcode
npx cap open ios
```

Then in Xcode:
1. Select your Apple Developer team for signing
2. Choose "Any iOS Device" as target
3. Product > Archive
4. Distribute App > App Store Connect
