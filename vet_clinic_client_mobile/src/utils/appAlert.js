import { Alert, Platform } from 'react-native';

export function showAppAlert(title, message, buttons) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const prompt = [title, message].filter(Boolean).join('\n\n');

  if (!buttons?.length) {
    globalThis.alert?.(prompt);
    return;
  }

  const cancelButton = buttons.find((button) => button.style === 'cancel');
  const actionButton = buttons.find((button) => button.style === 'destructive')
    || buttons.find((button) => button.style !== 'cancel');

  if (!actionButton) {
    globalThis.alert?.(prompt);
    return;
  }

  const confirmed = globalThis.confirm?.(prompt) ?? true;
  if (confirmed) actionButton.onPress?.();
  else cancelButton?.onPress?.();
}
