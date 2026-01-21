/**
 * AdMob Banner Component for Gharkharch
 * Displays banner ads in the app
 */

import React from 'react';
import { AdMobBanner as ExpoAdMobBanner } from 'expo-ads-admob';
import { View, StyleSheet } from 'react-native';
import { getAdUnitId } from '../services/adMobService';

interface AdMobBannerProps {
  size?: 'banner' | 'largeBanner' | 'mediumRectangle' | 'fullBanner' | 'leaderboard' | 'smartBannerPortrait' | 'smartBannerLandscape';
  position?: 'top' | 'bottom';
  style?: any;
}

/**
 * AdMob Banner Component
 * Shows banner ads in the app
 */
const AdMobBanner: React.FC<AdMobBannerProps> = ({
  size = 'smartBannerPortrait',
  position = 'bottom',
  style,
}) => {
  const bannerError = (error: string) => {
    console.warn('AdMob Banner Error:', error);
  };

  const adViewSuccess = () => {
    console.log('Banner ad loaded successfully');
  };

  // Get ad unit ID safely
  const adUnitId = getAdUnitId('banner');

  // Only render if we have a valid ad unit ID
  if (!adUnitId || adUnitId.includes('XXXXXXXXXXXXXXXX')) {
    console.warn('AdMob Banner: Invalid ad unit ID, skipping banner');
    return null;
  }

  return (
    <View style={[styles.container, position === 'top' ? styles.topBanner : styles.bottomBanner, style]}>
      <ExpoAdMobBanner
        bannerSize={size}
        adUnitID={adUnitId}
        servePersonalizedAds={true}
        onDidFailToReceiveAdWithError={bannerError}
        onAdViewDidReceiveAd={adViewSuccess}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  topBanner: {
    marginTop: 10,
  },
  bottomBanner: {
    marginBottom: 10,
  },
});

export default AdMobBanner;