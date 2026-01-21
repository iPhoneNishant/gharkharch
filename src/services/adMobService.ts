/**
 * AdMob Service for Gharkharch
 * Handles AdMob initialization and ad management
 */

import { AdMobBanner, AdMobInterstitial, AdMobRewarded, setTestDeviceIDAsync } from 'expo-ads-admob';
import { Platform } from 'react-native';

// Default test configuration - always use test ads for development
const TEST_AD_UNITS = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
} as const;

// Production ad units - replace with your actual AdMob IDs
const PRODUCTION_AD_UNITS = {
  banner: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  rewarded: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
} as const;

// Check if we should use test ads (development mode or invalid production IDs)
const shouldUseTestAds = (): boolean => {
  // Always use test ads in development
  if (__DEV__) {
    return true;
  }

  // Check if production IDs are valid (not placeholders)
  return Object.values(PRODUCTION_AD_UNITS).some(id =>
    id.includes('XXXXXXXXXXXXXXXX')
  );
};

/**
 * Initialize AdMob
 * Call this function when the app starts
 */
export const initializeAdMob = async (): Promise<void> => {
  try {
    // AdMob is initialized automatically by the Expo plugin in app.json
    // We just need to set up test device configuration for development

    const useTestAds = shouldUseTestAds();

    if (useTestAds) {
      try {
        await setTestDeviceIDAsync('EMULATOR');
        console.log('AdMob: Test device configured for development');
      } catch (error) {
        console.warn('AdMob: Could not set test device:', error);
      }
    }

    console.log(`AdMob initialized via Expo plugin (${useTestAds ? 'test mode' : 'production mode'})`);
  } catch (error) {
    console.error('AdMob initialization error:', error);
  }
};

/**
 * Banner Ad Component Props
 */
export interface BannerAdProps {
  size?: 'banner' | 'largeBanner' | 'mediumRectangle' | 'fullBanner' | 'leaderboard' | 'smartBannerPortrait' | 'smartBannerLandscape';
  position?: 'top' | 'bottom';
  onAdViewDidReceiveAd?: () => void;
  onDidFailToReceiveAdWithError?: (error: string) => void;
  onAdViewWillPresentScreen?: () => void;
  onAdViewWillDismissScreen?: () => void;
  onAdViewDidDismissScreen?: () => void;
}

/**
 * Get the appropriate ad unit ID based on environment
 */
export const getAdUnitId = (adType: 'banner' | 'interstitial' | 'rewarded'): string => {
  const useTestAds = shouldUseTestAds();

  if (useTestAds) {
    console.log(`AdMob: Using test ad for ${adType}`);
    return TEST_AD_UNITS[adType];
  }

  // Use production ad units
  const productionId = PRODUCTION_AD_UNITS[adType];

  // Double-check that production ID is valid
  if (productionId && !productionId.includes('XXXXXXXXXXXXXXXX')) {
    console.log(`AdMob: Using production ad for ${adType}`);
    return productionId;
  }

  // Fallback to test ads if production ID is invalid
  console.warn(`AdMob: Production ad unit for '${adType}' invalid, using test ad`);
  return TEST_AD_UNITS[adType];
};

/**
 * Show Interstitial Ad
 */
export const showInterstitialAd = async (): Promise<void> => {
  try {
    const adUnitId = getAdUnitId('interstitial');

    await AdMobInterstitial.setAdUnitID(adUnitId);

    // Load and show the ad
    await AdMobInterstitial.requestAdAsync();
    await AdMobInterstitial.showAdAsync();

    console.log('Interstitial ad shown successfully');
  } catch (error) {
    console.error('Failed to show interstitial ad:', error);
  }
};

/**
 * Show Rewarded Ad
 */
export const showRewardedAd = async (): Promise<void> => {
  try {
    const adUnitId = getAdUnitId('rewarded');

    await AdMobRewarded.setAdUnitID(adUnitId);

    // Load and show the ad
    await AdMobRewarded.requestAdAsync();
    await AdMobRewarded.showAdAsync();

    console.log('Rewarded ad shown successfully');
  } catch (error) {
    console.error('Failed to show rewarded ad:', error);
  }
};

/**
 * Check if interstitial ad is loaded
 */
export const isInterstitialAdLoaded = async (): Promise<boolean> => {
  try {
    return await AdMobInterstitial.getIsReadyAsync();
  } catch (error) {
    console.error('Failed to check interstitial ad status:', error);
    return false;
  }
};

/**
 * Check if rewarded ad is loaded
 */
export const isRewardedAdLoaded = async (): Promise<boolean> => {
  try {
    return await AdMobRewarded.getIsReadyAsync();
  } catch (error) {
    console.error('Failed to check rewarded ad status:', error);
    return false;
  }
};

/**
 * Preload Interstitial Ad
 */
export const preloadInterstitialAd = async (): Promise<void> => {
  try {
    const adUnitId = getAdUnitId('interstitial');

    await AdMobInterstitial.setAdUnitID(adUnitId);
    await AdMobInterstitial.requestAdAsync();
    console.log('Interstitial ad preloaded');
  } catch (error) {
    console.error('Failed to preload interstitial ad:', error);
  }
};

/**
 * Preload Rewarded Ad
 */
export const preloadRewardedAd = async (): Promise<void> => {
  try {
    const adUnitId = getAdUnitId('rewarded');

    await AdMobRewarded.setAdUnitID(adUnitId);
    await AdMobRewarded.requestAdAsync();
    console.log('Rewarded ad preloaded');
  } catch (error) {
    console.error('Failed to preload rewarded ad:', error);
  }
};

/**
 * Set up AdMob event listeners
 */
export const setupAdMobListeners = (): void => {
  // Interstitial Ad Listeners
  AdMobInterstitial.addEventListener('interstitialDidLoad', () => {
    console.log('Interstitial ad loaded');
  });

  AdMobInterstitial.addEventListener('interstitialDidFailToLoad', (error) => {
    console.error('Interstitial ad failed to load:', error);
  });

  AdMobInterstitial.addEventListener('interstitialDidOpen', () => {
    console.log('Interstitial ad opened');
  });

  AdMobInterstitial.addEventListener('interstitialDidClose', () => {
    console.log('Interstitial ad closed');
  });

  // Rewarded Ad Listeners
  AdMobRewarded.addEventListener('rewardedVideoDidLoad', () => {
    console.log('Rewarded ad loaded');
  });

  AdMobRewarded.addEventListener('rewardedVideoDidFailToLoad', (error) => {
    console.error('Rewarded ad failed to load:', error);
  });

  AdMobRewarded.addEventListener('rewardedVideoDidPresent', () => {
    console.log('Rewarded ad presented');
  });

  AdMobRewarded.addEventListener('rewardedVideoDidDismiss', () => {
    console.log('Rewarded ad dismissed');
  });

  AdMobRewarded.addEventListener('rewardedVideoUserDidEarnReward', (reward) => {
    console.log('User earned reward:', reward);
  });
};

/**
 * Clean up AdMob listeners
 */
export const cleanupAdMobListeners = (): void => {
  AdMobInterstitial.removeAllListeners();
  AdMobRewarded.removeAllListeners();
};