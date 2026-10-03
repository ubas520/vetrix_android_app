import { colors } from '../theme/colors';

const fallbackTone = {
  text: colors.info,
  background: '#EEF5FF',
  border: colors.lineStrong,
  accent: colors.info,
};

const statusToneMap = {
  pending: {
    text: '#B45309',
    background: '#FFFBEB',
    border: '#FDE68A',
    accent: '#F59E0B',
  },
  approved: {
    text: colors.success,
    background: colors.accentSoft,
    border: '#BBF7D0',
    accent: colors.success,
  },
  'in stock': {
    text: colors.success,
    background: colors.accentSoft,
    border: '#BBF7D0',
    accent: colors.success,
  },
  'limited stock': {
    text: '#B45309',
    background: '#FFFBEB',
    border: '#FDE68A',
    accent: '#F59E0B',
  },
  'out of stock': {
    text: colors.danger,
    background: '#FEF2F2',
    border: '#FECACA',
    accent: colors.danger,
  },
  completed: {
    text: colors.primary,
    background: colors.primarySoft,
    border: colors.lineStrong,
    accent: colors.primary,
  },
  cancelled: {
    text: colors.danger,
    background: '#FEF2F2',
    border: '#FECACA',
    accent: colors.danger,
  },
  rejected: {
    text: colors.danger,
    background: '#FEF2F2',
    border: '#FECACA',
    accent: colors.danger,
  },
  unread: {
    text: colors.primary,
    background: colors.primarySoft,
    border: colors.lineStrong,
    accent: colors.primary,
  },
  read: {
    text: colors.muted,
    background: '#F1F5F9',
    border: '#CBD5E1',
    accent: colors.mutedSoft,
  },
  'in-person confirmation': {
    text: colors.info,
    background: '#EEF5FF',
    border: colors.lineStrong,
    accent: colors.info,
  },
  'in person confirmation': {
    text: colors.info,
    background: '#EEF5FF',
    border: colors.lineStrong,
    accent: colors.info,
  },
};

export function getStatusTone(status) {
  const key = String(status || '').trim().toLowerCase();
  if (['waiting for clinic', 'due soon'].includes(key)) return statusToneMap.pending;
  if (key === 'overdue') return statusToneMap.rejected;
  if (key === 'no due date') return statusToneMap.read;
  return statusToneMap[key] || fallbackTone;
}

export function getThemedStatusTone(status, themeColors, isNightMode) {
  const tone = getStatusTone(status);
  if (!isNightMode) return tone;

  const key = String(status || '').trim().toLowerCase();
  if (['pending', 'limited stock', 'waiting for clinic', 'due soon'].includes(key)) return { ...tone, text: themeColors.warning, background: themeColors.amberSoft, border: themeColors.warning, accent: themeColors.warning };
  if (['approved', 'in stock'].includes(key)) return { ...tone, text: themeColors.success, background: themeColors.accentSoft, border: themeColors.success, accent: themeColors.success };
  if (['cancelled', 'rejected', 'out of stock', 'overdue'].includes(key)) return { ...tone, text: themeColors.danger, background: themeColors.dangerSoft, border: themeColors.danger, accent: themeColors.danger };
  if (['read', 'no due date'].includes(key)) return { ...tone, text: themeColors.muted, background: themeColors.surfaceAlt, border: themeColors.lineStrong, accent: themeColors.mutedSoft };
  return { ...tone, text: themeColors.primaryDark, background: themeColors.primarySoft, border: themeColors.primary, accent: themeColors.primary };
}
