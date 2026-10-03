import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppIcon from '../components/AppIcon';
import { spacing } from '../theme/spacing';
import { useMotion } from './MotionContext';
import { useTheme } from './ThemeContext';

const FeedbackContext = createContext(null);

export function FeedbackProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);
  const sequenceRef = useRef(0);

  const showToast = useCallback((message, options = {}) => {
    clearTimeout(timerRef.current);
    sequenceRef.current += 1;
    setToast({
      id: sequenceRef.current,
      message,
      title: options.title || (options.type === 'error' ? 'Please check' : 'Done'),
      type: options.type || 'success',
    });
    AccessibilityInfo.announceForAccessibility?.(`${options.title || 'Done'}. ${message}`);
    timerRef.current = setTimeout(() => setToast(null), options.duration || 2800);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);
  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {toast ? <Toast key={toast.id} toast={toast} onDismiss={() => setToast(null)} /> : null}
    </FeedbackContext.Provider>
  );
}

function Toast({ toast, onDismiss }) {
  const { colors } = useTheme();
  const { reduceMotion } = useMotion();
  const insets = useSafeAreaInsets();
  const [progress] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  const isError = toast.type === 'error';

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    Animated.spring(progress, {
      toValue: 1,
      damping: 18,
      stiffness: 220,
      mass: 0.8,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [progress, reduceMotion]);

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        {
          backgroundColor: colors.surfaceRaised,
          borderColor: isError ? colors.danger : colors.accent,
          top: Math.max(insets.top + 8, 18),
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) }],
        },
        Platform.OS === 'web'
          ? styles.webShadow
          : { shadowColor: colors.shadow, shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
      ]}>
      <View style={[styles.icon, { backgroundColor: isError ? colors.dangerSoft : colors.accentSoft }]}>
        <AppIcon name={isError ? 'danger' : 'check'} color={isError ? colors.danger : colors.success} size={18} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.ink }]}>{toast.title}</Text>
        <Text style={[styles.message, { color: colors.muted }]}>{toast.message}</Text>
      </View>
      <Text accessibilityRole="button" onPress={onDismiss} style={[styles.dismiss, { color: colors.primaryDark }]}>Close</Text>
    </Animated.View>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback must be used inside FeedbackProvider');
  return context;
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', zIndex: 1000, alignSelf: 'center', width: '92%', maxWidth: 430, minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderLeftWidth: 4, borderRadius: 12, padding: spacing.md, elevation: 12 },
  webShadow: { boxShadow: '0 8px 22px rgba(17,26,58,0.16)' },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  title: { fontFamily: 'Manrope_800ExtraBold', fontSize: 11 },
  message: { fontFamily: 'Manrope_500Medium', fontSize: 9, lineHeight: 14, marginTop: 1 },
  dismiss: { fontFamily: 'Manrope_700Bold', fontSize: 9, paddingVertical: spacing.sm },
});
