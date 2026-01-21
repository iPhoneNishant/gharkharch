# Google AdMob Setup Guide

## Overview

This guide will help you set up Google AdMob in your DailyMunim app for monetization through ads.

## Prerequisites

1. **Google AdMob Account**: Create an account at [admob.google.com](https://admob.google.com)
2. **App Published**: Your app should be published on Google Play Store and/or Apple App Store
3. **AdMob App IDs**: You'll need to create apps in AdMob and get the App IDs

## Step 1: Create AdMob Apps

### Android App
1. Go to [AdMob Console](https://admob.google.com)
2. Click **"Apps"** in the sidebar
3. Click **"Add app"**
4. Select **"Search for your app on Google Play"**
5. Find and select your app: `com.anonymous.dailymunim`
6. Click **"Continue"**
7. Copy the **App ID** (format: `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`)

### iOS App
1. In the same AdMob console, click **"Add app"** again
2. Select **"Search for your app on the App Store"**
3. Find and select your app: `com.anonymous.dailymunim`
4. Click **"Continue"**
5. Copy the **App ID** for iOS

## Step 2: Create Ad Units

### Banner Ad
1. In your AdMob app dashboard, click **"Ad units"**
2. Click **"Create ad unit"**
3. Select **"Banner"**
4. Name: `Dashboard Banner`
5. Size: `Smart banner` (recommended)
6. Click **"Create"**
7. Copy the **Ad unit ID** (format: `ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX`)

### Interstitial Ad
1. Click **"Create ad unit"** again
2. Select **"Interstitial"**
3. Name: `Transaction Interstitial`
4. Click **"Create"**
5. Copy the **Ad unit ID**

### Rewarded Ad (Optional)
1. Click **"Create ad unit"** again
2. Select **"Rewarded"**
3. Name: `Premium Feature Reward`
4. Click **"Create"**
5. Copy the **Ad unit ID**

## Step 3: Configure App Constants

### Update AdMob Configuration
Edit `src/config/constants.ts` and replace the placeholder values:

```typescript
export const ADMOB_CONFIG = {
  // Android AdMob App ID (from Step 1)
  androidAppId: 'ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX',

  // iOS AdMob App ID (from Step 1)
  iosAppId: 'ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX',

  // Ad Unit IDs (from Step 2)
  adUnits: {
    banner: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
    interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
    rewarded: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  },

  // Test Ad Unit IDs (keep these for development)
  testAdUnits: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
  },
} as const;

/**
 * Set to false when publishing to production
 */
export const USE_TEST_ADS = __DEV__; // true for development, false for production
```

## Step 4: Test Ads

### Development Testing
1. Keep `USE_TEST_ADS = true` in development
2. Test ads will show automatically
3. Use real device for better testing (emulators may not show ads)

### Production Setup
1. Set `USE_TEST_ADS = false` before building for production
2. Test with real AdMob IDs
3. Submit app updates to stores

## Step 5: Ad Placement Strategy

### Current Implementation
- **Banner Ad**: Dashboard screen bottom
- **Interstitial Ad**: Available for transaction screens
- **Rewarded Ad**: Available for premium features

### Recommended Placements
1. **Dashboard**: Banner ad (already implemented)
2. **Transaction Screens**: Interstitial after transaction completion
3. **Reports**: Banner ad
4. **Settings**: Non-intrusive banner

### Best Practices
- Don't show ads on first app launch
- Respect user experience
- Follow AdMob policies
- Monitor ad performance regularly

## Step 6: Compliance & Policies

### AdMob Policies
1. **Prohibited Content**: No gambling, adult content, etc.
2. **User Experience**: Don't interfere with core functionality
3. **Data Collection**: Be transparent about data usage

### Privacy Requirements
1. **Consent**: Implement consent mechanisms if required
2. **Children's Privacy**: If your app targets children under 13
3. **Data Disclosure**: Update privacy policy

## Step 7: Monitoring & Optimization

### AdMob Console
1. **Performance**: Monitor impressions, clicks, revenue
2. **Optimization**: Test different ad formats
3. **Targeting**: Improve user targeting

### Analytics
1. **Revenue Tracking**: Monitor earnings
2. **User Behavior**: Analyze ad interaction
3. **A/B Testing**: Test different placements

## Step 8: Troubleshooting

### Common Issues

#### Ads Not Showing
- Check internet connection
- Verify AdMob IDs are correct
- Ensure app is published
- Check AdMob console for approval status

#### Test Ads Not Working
- Confirm `USE_TEST_ADS = true`
- Test on real device
- Check console for error messages

#### Low Fill Rate
- Wait 24-48 hours after setup
- Check app category targeting
- Consider adding more ad units

## Step 9: Advanced Features

### Custom Ad Components
```typescript
import AdMobBanner from '../components/AdMobBanner';

// Use in any screen
<AdMobBanner size="largeBanner" position="top" />
```

### Programmatic Ad Loading
```typescript
import { showInterstitialAd, preloadInterstitialAd } from '../services/adMobService';

// Preload ad
await preloadInterstitialAd();

// Show when needed
await showInterstitialAd();
```

## Support

- **AdMob Help Center**: [support.google.com/admob](https://support.google.com/admob)
- **AdMob Policy Center**: [support.google.com/admob/answer/6128543](https://support.google.com/admob/answer/6128543)
- **Expo Ads Documentation**: [docs.expo.dev/versions/latest/sdk/admob](https://docs.expo.dev/versions/latest/sdk/admob)

## Important Notes

1. **Test Mode**: Always use test ads during development
2. **Compliance**: Follow all AdMob and app store policies
3. **User Experience**: Don't compromise app usability for ads
4. **Updates**: Regularly update to latest AdMob SDK versions
5. **Backup**: Keep your AdMob account credentials secure

---

**Last Updated**: January 2026
**AdMob SDK Version**: expo-ads-admob (latest)