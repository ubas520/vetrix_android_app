import { useEffect, useState } from 'react';
import { Animated, Platform } from 'react-native';

import { useMotion } from '../context/MotionContext';

export default function AnimatedReveal({ children, delay = 0, distance = 8, style }) {
  const { reduceMotion } = useMotion();
  const [progress] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    Animated.timing(progress, {
      toValue: 1,
      delay,
      duration: 240,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [delay, progress, reduceMotion]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
        },
      ]}>
      {children}
    </Animated.View>
  );
}
