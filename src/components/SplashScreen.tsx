/**
 * Modern Splash Screen for DailyMunim
 * Personal expense tracking and home finance app
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Conditionally import splash screen (won't work in Expo Go)
let SplashScreenModule: any = null;
try {
  SplashScreenModule = require('expo-splash-screen');
} catch (error) {
  // expo-splash-screen not available (e.g., Expo Go)
}
import { colors } from '../config/theme';

const { width, height } = Dimensions.get('window');

interface SplashScreenComponentProps {
  onReady: () => void;
}

const SplashScreenComponent: React.FC<SplashScreenComponentProps> = ({ onReady }) => {
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);
  const glowAnim = new Animated.Value(0);

  // Check if splash screen module is available (not in Expo Go)
  const hasSplashScreenSupport = SplashScreenModule !== null;

  useEffect(() => {

    if (hasSplashScreenSupport) {
      // Full-featured splash screen for development builds
      SplashScreenModule.preventAutoHideAsync().catch(() => {
        // Fallback if splash screen control fails
      });
    }

    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.elastic(1.2)),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ])
      ),
    ]).start();

    // Hide splash screen after animation completes
    const timer = setTimeout(async () => {
      if (hasSplashScreenSupport) {
        try {
          await SplashScreenModule.hideAsync();
        } catch (error) {
          // Fallback if splash screen hide fails
        }
      }
      onReady();
    }, 2500);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, glowAnim, onReady]);

  // Interpolate glow animation for opacity
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  // Fallback for environments without LinearGradient support
  const GradientBackground = hasSplashScreenSupport ? LinearGradient : View;
  const gradientProps = hasSplashScreenSupport
    ? {
        colors: ['#0d9488', '#a7f3d0'], // Teal green to light mint
        start: { x: 0.5, y: 0 },
        end: { x: 0.5, y: 1 },
      }
    : {};

  return (
    <View style={styles.container}>
      <GradientBackground
        style={[styles.gradient, !hasSplashScreenSupport && styles.fallbackGradient]}
        {...gradientProps}
      >
        {/* Animated glow effect behind icon */}
        <Animated.View
          style={[
            styles.glowContainer,
            {
              opacity: glowOpacity,
            },
          ]}
        >
          <View style={styles.glow} />
        </Animated.View>

        {/* Main icon container with animations */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Wallet icon with rupee symbol */}
          <View style={styles.walletIcon}>
            {/* Wallet base */}
            <View style={styles.walletBase}>
              {/* Wallet fold */}
              <View style={styles.walletFold} />
            </View>

            {/* Rupee symbol overlay */}
            <View style={styles.rupeeContainer}>
              <Text style={styles.rupeeSymbol}>₹</Text>
            </View>
          </View>

          {/* Subtle shadow for depth */}
          <View style={styles.iconShadow} />
        </Animated.View>
      </GradientBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackGradient: {
    backgroundColor: '#0d9488', // Teal green fallback
  },
  glowContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#ffffff',
    shadowColor: '#ffffff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletIcon: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletBase: {
    width: 120,
    height: 80,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletFold: {
    position: 'absolute',
    top: -8,
    width: 60,
    height: 16,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  rupeeContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rupeeSymbol: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#0d9488', // Teal green to match gradient
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  iconShadow: {
    position: 'absolute',
    top: 8,
    width: 120,
    height: 80,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 16,
    transform: [{ scaleX: 1.02 }],
  },
});

export default SplashScreenComponent;