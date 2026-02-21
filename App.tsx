import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import CommunityOnboardingModal from './CommunityOnboardingModal';

export default function App() {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();

    return () => pulseLoop.stop();
  }, [pulseAnim]);

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 5400,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 5400,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );
    floatLoop.start();

    return () => floatLoop.stop();
  }, [floatAnim]);

  return (
    <View style={styles.appShell}>
      <StatusBar barStyle="light-content" />
      <View pointerEvents="none" style={styles.topWash} />
      <View pointerEvents="none" style={styles.bottomWash} />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.heroGlow,
          {
            opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.48] }),
            transform: [
              { scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
              { translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) },
            ],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.accentGlow,
          {
            opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.3] }),
            transform: [
              { scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1.04, 1] }) },
              { translateX: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) },
            ],
          },
        ]}
      />

      <SafeAreaView style={styles.container}>
        <CommunityOnboardingModal />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: '#07202b',
    overflow: 'hidden',
  },
  topWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '46%',
    backgroundColor: 'rgba(20, 64, 83, 0.45)',
  },
  bottomWash: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(9, 29, 39, 0.62)',
  },
  heroGlow: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: '#2c8f8a',
    top: -140,
    right: -90,
  },
  accentGlow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#246f7d',
    bottom: -100,
    left: -70,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
});
