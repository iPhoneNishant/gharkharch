/**
 * AdMob Service for Gharkharch
 * Handles AdMob initialization and ad management
 */

import { AdMobBanner, AdMobInterstitial, AdMobRewarded, setTestDeviceIDAsync } from 'expo-ads-admob';
import { ADMOB_CONFIG, USE_TEST_ADS } from '../config/constants';
import { Platform } from 'react-native';

/**
 * Initialize AdMob
 * Call this function when the app starts
 */
export const initializeAdMob = async (): Promise<void> => {
  try {
    // Check if AdMob config is available
    if (!ADMOB_CONFIG) {
      console.warn('AdMob: Configuration not found, skipping initialization');
      return;
    }

    // Set test device for development
    if (__DEV__) {
      await setTestDeviceIDAsync('EMULATOR');
    }

    // Initialize AdMob with the appropriate app ID
    const appId = Platform.select({
      android: USE_TEST_ADS
        ? ADMOB_CONFIG?.testAdUnits?.banner?.split('/')[0]
        : ADMOB_CONFIG?.androidAppId,
      ios: USE_TEST_ADS
        ? ADMOB_CONFIG?.testAdUnits?.banner?.split('/')[0]
        : ADMOB_CONFIG?.iosAppId,
    });

    // AdMob initialization is handled automatically by the plugin in app.json
    // No need to call AdMob.start() manually
    console.log('AdMob initialized via plugin configuration');
  } catch (error) {
    console.error('Failed to initialize AdMob:', error);
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
export const getAdUnitId = (adType: keyof typeof ADMOB_CONFIG.adUnits): string => {
  try {
    if (USE_TEST_ADS) {
      // Use test ad units for development
      if (ADMOB_CONFIG?.testAdUnits?.[adType as keyof typeof ADMOB_CONFIG.testAdUnits]) {
        return ADMOB_CONFIG.testAdUnits[adType as keyof typeof ADMOB_CONFIG.testAdUnits];
      }
      // Fallback to test banner if specific ad type not found
      return ADMOB_CONFIG?.testAdUnits?.banner || 'ca-app-pub-3940256099942544/6300978111';
    }

    // Use production ad units
    if (ADMOB_CONFIG?.adUnits?.[adType]) {
      return ADMOB_CONFIG.adUnits[adType];
    }

    // Fallback to test banner if production ad unit not configured
    console.warn(`AdMob: Production ad unit for '${adType}' not configured, using test ad`);
    return ADMOB_CONFIG?.testAdUnits?.banner || 'ca-app-pub-3940256099942544/6300978111';
  } catch (error) {
    console.error('AdMob: Error getting ad unit ID:', error);
    // Ultimate fallback
    return 'ca-app-pub-3940256099942544/6300978111';
  }
};

/**
 * Show Interstitial Ad
 */
export const showInterstitialAd = async (): Promise<void> => {
  try {
    if (!ADMOB_CONFIG) {
      console.warn('AdMob: Configuration not available');
      return;
    }

    const adUnitId = getAdUnitId('interstitial');
    if (!adUnitId || adUnitId.includes('XXXXXXXXXXXXXXXX')) {
      console.warn('AdMob: Interstitial ad unit ID not properly configured');
      return;
    }

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
    if (!ADMOB_CONFIG) {
      console.warn('AdMob: Configuration not available');
      return;
    }

    const adUnitId = getAdUnitId('rewarded');
    if (!adUnitId || adUnitId.includes('XXXXXXXXXXXXXXXX')) {
      console.warn('AdMob: Rewarded ad unit ID not properly configured');
      return;
    }

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
    if (!ADMOB_CONFIG) {
      console.warn('AdMob: Configuration not available for preloading');
      return;
    }

    const adUnitId = getAdUnitId('interstitial');
    if (!adUnitId || adUnitId.includes('XXXXXXXXXXXXXXXX')) {
      console.warn('AdMob: Interstitial ad unit ID not properly configured for preloading');
      return;
    }

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
    if (!ADMOB_CONFIG) {
      console.warn('AdMob: Configuration not available for preloading');
      return;
    }

    const adUnitId = getAdUnitId('rewarded');
    if (!adUnitId || adUnitId.includes('XXXXXXXXXXXXXXXX')) {
      console.warn('AdMob: Rewarded ad unit ID not properly configured for preloading');
      return;
    }

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