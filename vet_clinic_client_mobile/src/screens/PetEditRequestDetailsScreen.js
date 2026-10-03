import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppCard from '../components/AppCard';
import AppIcon from '../components/AppIcon';
import EmptyState from '../components/EmptyState';
import PetAvatar from '../components/PetAvatar';
import StackHeader from '../components/StackHeader';
import StatusBadge from '../components/StatusBadge';
import { getPetStatusLabel } from '../utils/careStatus';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { formatDateTime } from '../utils/helpers';

export default function PetEditRequestDetailsScreen({ navigation, route }) {
  const { colors: themeColors } = useTheme();
  const request = route.params?.request;

  if (!request) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}> 
        <View style={styles.container}>
          <StackHeader navigation={navigation} title="Request Details" />
          <EmptyState title="Request not found" message="This pet edit request is no longer available." icon="pets" />
        </View>
      </SafeAreaView>
    );
  }

  const changes = Array.isArray(request.changes) ? request.changes : [];
  const reviewNotice = getReviewNotice(request.status, themeColors);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}> 
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <StackHeader navigation={navigation} title="Request Details" />

        <AppCard style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View style={[styles.summaryIcon, { backgroundColor: themeColors.amberSoft }]}> 
              <AppIcon name="clock" color={themeColors.warning} size={20} />
            </View>
            <View style={styles.summaryCopy}>
              <Text style={[styles.petName, { color: themeColors.ink }]}>{request.petName}</Text>
              <Text style={[styles.submittedAt, { color: themeColors.muted }]}>Submitted {formatDateTime(request.submittedAt)}</Text>
            </View>
            <StatusBadge label={getPetStatusLabel(request.status || 'Pending')} status={request.status || 'Pending'} />
          </View>

          <View style={[styles.notice, { backgroundColor: reviewNotice.background, borderColor: reviewNotice.color }]}> 
            <AppIcon name={reviewNotice.icon} color={reviewNotice.color} size={17} />
            <Text style={[styles.noticeText, { color: reviewNotice.color }]}> 
              {reviewNotice.message}
            </Text>
          </View>

          {request.adminNotes ? (
            <View style={[styles.clinicNote, { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.line }]}> 
              <Text style={[styles.clinicNoteLabel, { color: themeColors.muted }]}>Clinic note</Text>
              <Text selectable style={[styles.clinicNoteText, { color: themeColors.ink }]}>{request.adminNotes}</Text>
            </View>
          ) : null}
        </AppCard>

        <View style={styles.sectionHeading}>
          <View style={styles.sectionHeadingCopy}>
            <Text style={[styles.sectionTitle, { color: themeColors.ink }]}>Requested changes</Text>
            <Text style={[styles.sectionHelp, { color: themeColors.muted }]}>Current approved information is shown first.</Text>
          </View>
          <View style={[styles.changeCount, { backgroundColor: themeColors.primarySoft }]}> 
            <Text style={[styles.changeCountText, { color: themeColors.primaryDark }]}>{changes.length}</Text>
          </View>
        </View>

        {changes.length ? (
          changes.map((change) => (
            <ChangeCard key={change.field} change={change} petName={request.petName} />
          ))
        ) : (
          <AppCard>
            <Text style={[styles.emptyChanges, { color: themeColors.muted }]}>No changed fields are available for this request.</Text>
          </AppCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ChangeCard({ change, petName }) {
  const { colors: themeColors } = useTheme();

  return (
    <AppCard style={styles.changeCard}>
      <Text style={[styles.changeLabel, { color: themeColors.ink }]}>{change.label}</Text>

      {change.field === 'photo' ? (
        <View style={styles.photoComparison}>
          <PhotoValue label="Current approved" name={petName} uri={change.currentValue} />
          <View style={[styles.photoArrow, { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.line }]}> 
            <AppIcon name="forward" color={themeColors.muted} size={17} />
          </View>
          <PhotoValue label="Requested" name={petName} requested uri={change.requestedValue} />
        </View>
      ) : (
        <View style={styles.valueStack}>
          <ChangeValue label="Current approved" value={change.currentDisplayValue} />
          <View style={styles.changeDirection}>
            <View style={[styles.directionLine, { backgroundColor: themeColors.line }]} />
            <View style={[styles.directionIcon, { backgroundColor: themeColors.primarySoft }]}> 
              <AppIcon name="down" color={themeColors.primaryDark} size={15} />
            </View>
            <View style={[styles.directionLine, { backgroundColor: themeColors.line }]} />
          </View>
          <ChangeValue label="Requested" requested value={change.requestedDisplayValue} />
        </View>
      )}
    </AppCard>
  );
}

function ChangeValue({ label, requested = false, value }) {
  const { colors: themeColors } = useTheme();

  return (
    <View
      style={[
        styles.valueBox,
        {
          backgroundColor: requested ? themeColors.primarySoft : themeColors.surfaceAlt,
          borderColor: requested ? themeColors.primaryMuted : themeColors.line,
        },
      ]}>
      <Text style={[styles.valueLabel, { color: requested ? themeColors.primaryDark : themeColors.muted }]}>{label}</Text>
      <Text selectable style={[styles.valueText, { color: themeColors.ink }]}>{value || 'Not set'}</Text>
    </View>
  );
}

function PhotoValue({ label, name, requested = false, uri }) {
  const { colors: themeColors } = useTheme();

  return (
    <View
      style={[
        styles.photoValue,
        {
          backgroundColor: requested ? themeColors.primarySoft : themeColors.surfaceAlt,
          borderColor: requested ? themeColors.primaryMuted : themeColors.line,
        },
      ]}>
      <Text style={[styles.valueLabel, { color: requested ? themeColors.primaryDark : themeColors.muted }]}>{label}</Text>
      <PetAvatar pet={{ name, photoUri: uri }} name={name} size={68} />
      <Text style={[styles.photoCaption, { color: themeColors.ink }]}>{requested ? (uri ? 'New photo' : 'No photo') : 'Current photo'}</Text>
    </View>
  );
}

function getReviewNotice(status, themeColors) {
  const normalizedStatus = String(status || '').toLowerCase();
  if (normalizedStatus === 'approved') {
    return {
      background: themeColors.accentSoft,
      color: themeColors.success,
      icon: 'check',
      message: 'The clinic approved this change. The updated pet profile is now live.',
    };
  }
  if (normalizedStatus === 'rejected') {
    return {
      background: themeColors.dangerSoft,
      color: themeColors.danger,
      icon: 'danger',
      message: 'The clinic rejected this change. The current approved information was not changed.',
    };
  }
  return {
    background: themeColors.amberSoft,
    color: themeColors.warning,
    icon: 'clock',
    message: 'The current approved profile stays active until the clinic reviews this change.',
  };
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl },
  summaryCard: { marginBottom: spacing.lg },
  summaryTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  summaryIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  summaryCopy: { flex: 1, minWidth: 0 },
  petName: { color: colors.ink, fontSize: 17, fontFamily: 'Manrope_800ExtraBold' },
  submittedAt: { color: colors.muted, fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderWidth: 1, borderRadius: spacing.radiusSm, padding: spacing.md, marginTop: spacing.md },
  noticeText: { flex: 1, color: colors.warning, fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_600SemiBold' },
  clinicNote: { borderWidth: 1, borderRadius: spacing.radiusSm, padding: spacing.md, marginTop: spacing.sm },
  clinicNoteLabel: { color: colors.muted, fontSize: 12, lineHeight: 17, fontFamily: 'Manrope_700Bold', textTransform: 'uppercase', letterSpacing: 0.3 },
  clinicNoteText: { color: colors.ink, fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_600SemiBold', marginTop: spacing.xs },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm },
  sectionHeadingCopy: { flex: 1, minWidth: 0 },
  sectionTitle: { color: colors.ink, fontSize: 16, fontFamily: 'Manrope_800ExtraBold' },
  sectionHelp: { color: colors.muted, fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  changeCount: { minWidth: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  changeCountText: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold' },
  changeCard: { marginBottom: spacing.sm },
  changeLabel: { color: colors.ink, fontSize: 14, fontFamily: 'Manrope_800ExtraBold', marginBottom: spacing.sm },
  valueStack: { gap: 0 },
  valueBox: { borderWidth: 1, borderRadius: spacing.radiusSm, padding: spacing.md },
  valueLabel: { color: colors.muted, fontSize: 12, lineHeight: 17, fontFamily: 'Manrope_700Bold', textTransform: 'uppercase', letterSpacing: 0.3 },
  valueText: { color: colors.ink, fontSize: 14, lineHeight: 19, fontFamily: 'Manrope_700Bold', marginTop: spacing.xs },
  changeDirection: { height: 26, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg },
  directionLine: { flex: 1, height: 1 },
  directionIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  photoComparison: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  photoValue: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: spacing.radiusSm, alignItems: 'center', padding: spacing.sm },
  photoArrow: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  photoCaption: { color: colors.ink, fontSize: 12, fontFamily: 'Manrope_700Bold', textAlign: 'center', marginTop: spacing.xs },
  emptyChanges: { color: colors.muted, fontSize: 14, lineHeight: 19, fontFamily: 'Manrope_500Medium' },
});
