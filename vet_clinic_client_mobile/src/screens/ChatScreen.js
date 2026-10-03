import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppCard from '../components/AppCard';
import AppIcon from '../components/AppIcon';
import NotificationPanel from '../components/NotificationPanel';
import NotificationBell from '../components/NotificationBell';
import StackHeader from '../components/StackHeader';
import { useClientData } from '../context/ClientDataContext';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const initialMessages = [
  {
    id: 'local-guide-welcome',
    type: 'bot',
    triage: 'General',
    text: 'I can offer basic on-device pet-care guidance using the live pet profiles on this account.',
    safetyNote: 'This chat is not sent to the clinic. For diagnosis or urgent symptoms, contact a veterinarian.',
  },
];

const quickQuestions = [
  { label: 'Not eating', message: 'My pet is not eating. What should I monitor?' },
  { label: 'Vomiting', message: 'My pet is vomiting. What warning signs should I watch for?' },
  { label: 'Sneezing', message: 'My pet keeps sneezing. When should I contact the clinic?' },
  { label: 'After vaccine', message: 'What should I monitor after a vaccine?' },
];

export default function ChatScreen({ navigation }) {
  const { colors: themeColors, isNightMode } = useTheme();
  const { pets } = useClientData();
  const { unreadCount } = useNotifications();
  const scrollRef = useRef(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [apiOpen, setApiOpen] = useState(false);
  const primaryActionText = isNightMode ? colors.primaryDeep : colors.surface;

  const sendMessage = (message) => {
    const cleanMessage = message.trim();
    if (!cleanMessage) return;

    setInput('');
    setMessages((current) => [...current, { id: Date.now(), type: 'user', text: cleanMessage }]);
    setTyping(true);

    setTimeout(() => {
      setMessages((current) => [...current, buildLocalVetrixReply(cleanMessage, pets)]);
      setTyping(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }, 450);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <NotificationPanel visible={panelOpen} onClose={() => setPanelOpen(false)} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <StackHeader
          navigation={navigation}
          title="Vetrix Assistant"
          action={<NotificationBell count={unreadCount} onPress={() => setPanelOpen(true)} />}
        />

        <View style={styles.intro}>
          <View style={[styles.assistantIcon, { backgroundColor: themeColors.primary }]}> 
            <AppIcon name="assistant" color="#FFFFFF" size={25} />
          </View>
          <View style={styles.introCopy}>
            <Text style={[styles.title, { color: themeColors.ink }]}>How can I help?</Text>
            <Text style={[styles.subtitle, { color: themeColors.muted }]}>On-device pet-care guidance. Urgent symptoms need a veterinarian.</Text>
          </View>
        </View>

        <View style={[styles.chatBox, { backgroundColor: themeColors.surface, borderColor: themeColors.line }]}>
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.bubble,
                message.type === 'user'
                  ? [styles.userBubble, { backgroundColor: themeColors.primary }]
                  : [styles.botBubble, { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.line }],
              ]}>
              {message.type === 'bot' ? <Text style={[styles.botName, { color: themeColors.primaryDark }]}>Vetrix guide</Text> : null}
              {message.triage ? <Text style={[styles.triage, triageStyle(message.triage, themeColors)]}>Triage: {message.triage}</Text> : null}
              <Text style={[styles.bubbleText, { color: themeColors.ink }, message.type === 'user' && { color: primaryActionText }]}>{message.text}</Text>
              {message.questions?.length ? (
                <View style={[styles.questionBlock, { borderTopColor: themeColors.line }]}>
                  <Text style={[styles.questionTitle, { color: themeColors.ink }]}>Follow-up questions</Text>
                  {message.questions.map((question) => (
                    <Text key={question} style={[styles.questionText, { color: themeColors.muted }]}>- {question}</Text>
                  ))}
                </View>
              ) : null}
              {message.safetyNote ? <Text style={styles.safetyNote}>{message.safetyNote}</Text> : null}
            </View>
          ))}
          {typing ? (
            <View style={[styles.bubble, styles.botBubble, { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.line }]}>
              <Text style={[styles.botName, { color: themeColors.primaryDark }]}>Vetrix guide</Text>
              <Text style={[styles.bubbleText, { color: themeColors.ink }]}>Preparing clear guidance...</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.chips}>
          {quickQuestions.map((item) => (
            <Pressable
              key={item.label}
              style={[styles.chip, { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.lineStrong }]}
              onPress={() => sendMessage(item.message)}>
              <Text style={[styles.chipText, { color: themeColors.primaryDark }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.inputRow, { backgroundColor: themeColors.surface, borderColor: themeColors.line }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Describe your pet concern"
            placeholderTextColor={themeColors.muted}
            style={[styles.input, { color: themeColors.ink }]}
            multiline
          />
          <Pressable accessibilityLabel="Send message" style={[styles.sendButton, { backgroundColor: themeColors.primary }]} onPress={() => sendMessage(input)}>
            <AppIcon name="send" color={primaryActionText} size={18} />
          </Pressable>
        </View>

        <Text style={[styles.footerNote, { color: themeColors.muted }]}>
          This assistant gives general guidance only. Severe, fast-changing, or persistent symptoms need a veterinarian.
        </Text>

        <AppCard elevated={false} style={[styles.apiCard, { backgroundColor: themeColors.surface, borderColor: themeColors.line }]}>
          <Pressable style={styles.apiToggle} onPress={() => setApiOpen((value) => !value)}>
            <View style={styles.apiCopy}>
              <Text style={[styles.apiSmall, { color: themeColors.muted }]}>Connection status</Text>
              <Text style={[styles.apiTitle, { color: themeColors.ink }]}>On-device care guide</Text>
            </View>
            <Text style={[styles.apiToggleText, { color: themeColors.primaryDark }]}>{apiOpen ? 'Hide' : 'Details'}</Text>
          </Pressable>
          {apiOpen ? (
            <View style={[styles.apiDetails, { borderTopColor: themeColors.line }]}>
              <Text style={[styles.apiText, { color: themeColors.muted }]}> 
                Messages on this screen stay in the app and are not sent to the clinic website. Client records,
                appointments, alerts, and products use the live Vetrix API separately.
              </Text>
              <Text style={[styles.apiWarning, { backgroundColor: themeColors.primarySoft, color: themeColors.primaryDark }]}>For clinical advice, diagnosis, or urgent symptoms, contact the clinic directly.</Text>
            </View>
          ) : null}
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function buildLocalVetrixReply(message, pets) {
  const lower = message.toLowerCase();
  const matchedPet = pets.find((pet) => lower.includes(pet.name.toLowerCase()));
  let triage = 'Low to moderate';
  let guidance = 'Monitor your pet closely and contact the clinic if symptoms persist or worsen.';

  if (/(blood|seizure|breath|poison|collapse)/.test(lower)) {
    triage = 'Urgent';
    guidance = 'This may be urgent. Contact a veterinarian or emergency clinic immediately.';
  } else if (/(vomit|diarrhea|not eating|lethargic)/.test(lower)) {
    triage = 'Moderate';
    guidance =
      'These symptoms can become serious if persistent. Offer clean water, avoid human medicine, and schedule a clinic visit if symptoms continue for more than 24 hours or worsen.';
  } else if (lower.includes('sneez')) {
    guidance = 'For sneezing, observe breathing, appetite, discharge, and energy. Persistent symptoms should be checked by the veterinarian.';
  } else if (lower.includes('vaccine')) {
    guidance = 'Mild tiredness can happen after vaccines. Swelling, breathing problems, or severe weakness need urgent care.';
  }

  const petContext = matchedPet
    ? `Pet context found: ${matchedPet.name} is a ${matchedPet.species} / ${matchedPet.breed}, ${matchedPet.age}, ${matchedPet.weight}. Allergies: ${matchedPet.allergies}.`
    : 'No specific pet name was found in the message.';

  return {
    id: Date.now() + 1,
    type: 'bot',
    triage,
    text: `${petContext}\n\nGeneral guidance: ${guidance}`,
    questions: [
      'How long has this been happening?',
      'Is your pet still eating or drinking?',
      'Any blood, seizure, breathing issue, or collapse?',
      'What is your pet age and weight?',
    ],
    safetyNote: 'Guidance only. For severe or persistent symptoms, contact a veterinarian.',
  };
}

function triageStyle(triage, themeColors) {
  if (triage === 'Urgent') return { backgroundColor: themeColors.dangerSoft, color: themeColors.danger };
  if (triage === 'Moderate') return { backgroundColor: themeColors.amberSoft, color: themeColors.warning };
  return { backgroundColor: themeColors.primarySoft, color: themeColors.primaryDark };
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl },
  intro: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  assistantIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  introCopy: { flex: 1 },
  title: { color: colors.ink, fontSize: 20, fontFamily: 'Manrope_800ExtraBold' },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: spacing.xs },
  apiCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    marginTop: spacing.sm,
  },
  apiToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  apiCopy: { flex: 1 },
  apiSmall: { color: colors.muted, fontSize: 12, fontFamily: 'Manrope_700Bold' },
  apiTitle: { color: colors.ink, fontSize: 14, fontFamily: 'Manrope_800ExtraBold', marginTop: spacing.xs },
  apiToggleText: { color: colors.primaryDark, fontFamily: 'Manrope_800ExtraBold' },
  apiDetails: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  apiText: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: spacing.xs },
  apiWarning: {
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    borderRadius: spacing.radiusSm,
    overflow: 'hidden',
    padding: spacing.sm,
    fontFamily: 'Manrope_700Bold',
    marginTop: spacing.sm,
  },
  chatBox: {
    minHeight: 300,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: spacing.radius,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bubble: { padding: spacing.md, borderRadius: 14, marginBottom: spacing.sm, maxWidth: '88%' },
  botBubble: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 5 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 5 },
  botName: { color: colors.primaryDark, fontSize: 13, fontFamily: 'Manrope_800ExtraBold', marginBottom: spacing.xs },
  triage: {
    alignSelf: 'flex-start',
    borderRadius: spacing.radiusSm,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    marginBottom: spacing.sm,
  },
  bubbleText: { color: colors.ink, fontSize: 13, lineHeight: 18 },
  userText: { color: colors.surface },
  questionBlock: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  questionTitle: { color: colors.ink, fontSize: 13, fontFamily: 'Manrope_800ExtraBold', marginBottom: spacing.xs },
  questionText: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  safetyNote: {
    color: colors.danger,
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
    marginTop: spacing.sm,
    lineHeight: 17,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: colors.surfaceAlt,
    borderRadius: spacing.radiusSm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipText: { color: colors.primaryDark, fontSize: 13, fontFamily: 'Manrope_700Bold' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: spacing.radius,
    padding: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 96,
    color: colors.ink,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontFamily: 'Manrope_700Bold',
  },
  sendButton: {
    minHeight: 46,
    borderRadius: spacing.radiusSm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    width: 42,
    paddingHorizontal: 0,
  },
  footerNote: { color: colors.muted, fontSize: 14, lineHeight: 19, marginTop: spacing.md },
});
