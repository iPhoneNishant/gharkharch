/**
 * AdMob Service for Gharkharch
 * Handles AdMob initialization and ad management
 */

import { AdMob, AdMobBanner, AdMobInterstitial, AdMobRewarded, setTestDeviceIDAsync } from 'expo-ads-admob';
import { ADMOB_CONFIG, USE_TEST_ADS } from '../config/constants';
import { Platform } from 'react-native';

/**
 * Initialize AdMob
 * Call this function when the app starts
 */
export const initializeAdMob = async (): Promise<void> => {
  try {
    // Set test device for development
    if (__DEV__) {
      await setTestDeviceIDAsync('EMULATOR');
    }

    // Initialize AdMob with the appropriate app ID
    const appId = Platform.select({
      android: USE_TEST_ADS ? ADMOB_CONFIG.testAdUnits.banner.split('/')[0] : ADMOB_CONFIG.androidAppId,
      ios: USE_TEST_ADS ? ADMOB_CONFIG.testAdUnits.banner.split('/')[0] : ADMOB_CONFIG.iosAppId,
    });

    if (appId) {
      await AdMob.start(appId);
      console.log('AdMob initialized successfully');
    }
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
  if (USE_TEST_ADS) {
    return ADMOB_CONFIG.testAdUnits[adType as keyof typeof ADMOB_CONFIG.testAdUnits] || ADMOB_CONFIG.testAdUnits.banner;
  }
  return ADMOB_CONFIG.adUnits[adType];
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

  AdMobRewarded.addEventListener('rewardedVideoDidOpen', () => {
    console.log('Rewarded ad opened');
  });

  AdMobRewarded.addEventListener('rewardedVideoDidClose', () => {
    console.log('Rewarded ad closed');
  });

  AdMobRewarded.addEventListener('rewardedVideoDidStart', () => {
    console.log('Rewarded ad started');
  });

  AdMobRewarded.addEventListener('rewardedVideoDidComplete', () => {
    console.log('Rewarded ad completed');
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