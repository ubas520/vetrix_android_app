import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import AppIcon from './AppIcon';

export default function ThemedArtwork({ source, style, imageStyle, resizeMode = 'cover', children }) {
  const { colors, isNightMode } = useTheme();
  const [failed, setFailed] = useState(false);

  return (
    <View style={[styles.frame, { backgroundColor: colors.artworkSurface }, style]}>
      {failed ? <View style={styles.fallback}><AppIcon name="pets" color={colors.primaryDark} size={42} /></View> : (
        <Image
          source={source}
          resizeMode={resizeMode}
          onError={() => setFailed(true)}
          style={[StyleSheet.absoluteFill, styles.image, isNightMode && styles.dimmed, imageStyle]}
        />
      )}
      {isNightMode ? <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: colors.artworkOverlay, pointerEvents: 'none' }]} /> : null}
      {children ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden' },
  image: { width: '100%', height: '100%', zIndex: 1 },
  dimmed: { opacity: 0.84 },
  fallback: { ...StyleSheet.absoluteFillObject, zIndex: 1, alignItems: 'center', justifyContent: 'center' },
  overlay: { zIndex: 2 },
  content: { ...StyleSheet.absoluteFillObject, zIndex: 3, justifyContent: 'center' },
});
