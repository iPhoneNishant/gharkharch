/**
 * AdMob Service for Gharkharch
 * Handles AdMob initialization and ad management
 */

import { AdMobBanner, AdMobInterstitial, AdMobRewarded, setTestDeviceIDAsync } from 'expo-ads-admob';
import { Platform } from 'react-native';

// Lazy import to avoid initialization issues
let ADMOB_CONFIG: any = null;
let USE_TEST_ADS: boolean = true;

const loadAdMobConfig = () => {
  if (!ADMOB_CONFIG) {
    try {
      const constants = require('../config/constants');
      ADMOB_CONFIG = constants.ADMOB_CONFIG;
      USE_TEST_ADS = constants.USE_TEST_ADS;
    } catch (error) {
      console.error('Failed to load AdMob config:', error);
      // Fallback configuration
      ADMOB_CONFIG = {
        testAdUnits: {
          banner: 'ca-app-pub-3940256099942544/6300978111',
          interstitial: 'ca-app-pub-3940256099942544/1033173712',
          rewarded: 'ca-app-pub-3940256099942544/5224354917',
        }
      };
      USE_TEST_ADS = true;
    }
  }
};

/**
 * Initialize AdMob
 * Call this function when the app starts
 */
export const initializeAdMob = async (): Promise<void> => {
  try {
    // Load config first
    loadAdMobConfig();

    // AdMob is initialized automatically by the Expo plugin in app.json
    // We just need to set up test device configuration for development

    if (__DEV__) {
      try {
        await setTestDeviceIDAsync('EMULATOR');
        console.log('AdMob: Test device configured for development');
      } catch (error) {
        console.warn('AdMob: Could not set test device:', error);
      }
    }

    console.log('AdMob initialized via Expo plugin');
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
  try {
    // Load config if not already loaded
    loadAdMobConfig();

    if (USE_TEST_ADS) {
      return getTestAdUnitId(adType);
    }

    // Use production ad units
    if (ADMOB_CONFIG?.adUnits?.[adType]) {
      const adUnitId = ADMOB_CONFIG.adUnits[adType];
      // Check if it's a placeholder ID
      if (adUnitId && !adUnitId.includes('XXXXXXXXXXXXXXXX')) {
        return adUnitId;
      }
    }

    // Fallback to test ads if production not configured
    console.warn(`AdMob: Production ad unit for '${adType}' not configured, using test ad`);
    return getTestAdUnitId(adType);
  } catch (error) {
    console.error('AdMob: Error getting ad unit ID:', error);
    // Ultimate fallback
    return getTestAdUnitId(adType);
  }
};

/**
 * Get test ad unit ID for the specified ad type
 */
const getTestAdUnitId = (adType: 'banner' | 'interstitial' | 'rewarded'): string => {
  const testIds = {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
  };
  return testIds[adType];
};

/**
 * Show Interstitial Ad
 */
export const showInterstitialAd = async (): Promise<void> => {
  try {
    loadAdMobConfig();

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
    loadAdMobConfig();

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
    loadAdMobConfig();

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
    loadAdMobConfig();

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