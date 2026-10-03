import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { getPetImage } from '../assets/images';
import { useTheme } from '../context/ThemeContext';
import AppIcon from './AppIcon';

export default function PetAvatar({ pet, name, size = 52, source: sourceOverride, style }) {
  const { colors, isNightMode } = useTheme();
  const source = sourceOverride || (pet?.photoUri ? { uri: pet.photoUri } : getPetImage(pet || name));
  const [failedSource, setFailedSource] = useState(null);
  const sourceKey = typeof source === 'number' ? source : source?.uri;
  const sourceFailed = sourceKey && failedSource === sourceKey;
  const radius = size / 2;

  return (
    <View
      style={[
        styles.frame,
        { width: size, height: size, borderRadius: radius, backgroundColor: colors.primarySoft, borderColor: colors.surface },
        style,
      ]}>
      {source && !sourceFailed ? (
        <Image source={source} onError={() => setFailedSource(sourceKey)} style={[styles.image, { borderRadius: radius }, isNightMode && styles.dimmed]} resizeMode="cover" />
      ) : (
        <AppIcon name="pets" color={colors.primaryDark} size={size * 0.46} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  dimmed: { opacity: 0.9 },
});
