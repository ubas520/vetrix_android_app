import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppIcon from '../components/AppIcon';
import { useTheme } from '../context/ThemeContext';
import { useMotion } from '../context/MotionContext';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import HomeScreen from '../screens/HomeScreen';
import MoreScreen from '../screens/MoreScreen';
import PetsScreen from '../screens/PetsScreen';
import RecordsScreen from '../screens/RecordsScreen';

const Tab = createBottomTabNavigator();

const tabs = {
  Home: { label: 'Home', icon: 'home' },
  Pets: { label: 'Pets', icon: 'pets' },
  Book: { label: 'Book', icon: 'appointment' },
  Records: { label: 'Records', icon: 'records' },
  More: { label: 'More', icon: 'more' },
};

function TabIcon({ icon, color, focused }) {
  const { colors } = useTheme();
  return (
    <View style={styles.iconSlot}>
      <AppIcon name={icon} color={focused ? colors.primary : color} size={22} strokeWidth={focused ? 2.35 : 1.8} />
      {focused ? <View style={[styles.activeDot, { backgroundColor: colors.primary }]} /> : null}
    </View>
  );
}

export default function ClientTabs() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { reduceMotion } = useMotion();
  return (
    <View style={styles.shell}>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.tabInactive,
          tabBarStyle: [
            styles.tabBar,
            { backgroundColor: colors.nav, borderColor: colors.line, height: 64 + Math.max(insets.bottom, 12), paddingBottom: Math.max(insets.bottom, 12) },
            Platform.OS === 'web'
              ? styles.tabBarWeb
              : { shadowColor: colors.shadow, shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: -5 } },
          ],
          tabBarItemStyle: styles.tabItem,
          tabBarLabelStyle: styles.label,
          tabBarIcon: ({ color, focused }) => <TabIcon icon={tabs[route.name].icon} color={color} focused={focused} />,
          tabBarHideOnKeyboard: true,
          animation: reduceMotion ? 'none' : 'fade',
        })}>
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: tabs.Home.label }} />
        <Tab.Screen name="Pets" component={PetsScreen} options={{ title: tabs.Pets.label }} />
        <Tab.Screen name="Book" component={AppointmentsScreen} options={{ title: tabs.Book.label }} />
        <Tab.Screen name="Records" component={RecordsScreen} options={{ title: tabs.Records.label }} />
        <Tab.Screen name="More" component={MoreScreen} options={{ title: tabs.More.label }} />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  tabBar: {
    minHeight: 76,
    borderTopWidth: 1,
    paddingHorizontal: 4,
    paddingTop: 7,
    paddingBottom: Platform.OS === 'ios' ? 12 : 8,
    elevation: 12,
  },
  tabItem: { minWidth: 0, height: 56, paddingVertical: 0 },
  tabBarWeb: { boxShadow: '0 -5px 20px rgba(35,52,95,0.08)' },
  iconSlot: { width: 30, height: 27, alignItems: 'center', justifyContent: 'center' },
  activeDot: { position: 'absolute', bottom: 0, width: 4, height: 4, borderRadius: 2 },
  label: { fontSize: 12, lineHeight: 17, fontFamily: 'Manrope_700Bold', marginTop: 1 },
});
