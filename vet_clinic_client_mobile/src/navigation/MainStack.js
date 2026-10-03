import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ChatScreen from '../screens/ChatScreen';
import ClinicDirectionsScreen from '../screens/ClinicDirectionsScreen';
import PetDetailsScreen from '../screens/PetDetailsScreen';
import PetEditRequestDetailsScreen from '../screens/PetEditRequestDetailsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProductCatalogScreen from '../screens/ProductCatalogScreen';
import ProductCheckoutScreen from '../screens/ProductCheckoutScreen';
import ProductOrdersScreen from '../screens/ProductOrdersScreen';
import ProductOrderDetailsScreen from '../screens/ProductOrderDetailsScreen';
import QRScreen from '../screens/QRScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useMotion } from '../context/MotionContext';
import ClientTabs from './ClientTabs';

const Stack = createNativeStackNavigator();

export default function MainStack() {
  const { reduceMotion } = useMotion();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: reduceMotion ? 'none' : 'slide_from_right' }}>
      <Stack.Screen name="ClientTabs" component={ClientTabs} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="ClinicDirections" component={ClinicDirectionsScreen} />
      <Stack.Screen name="PetDetails" component={PetDetailsScreen} />
      <Stack.Screen name="PetEditRequestDetails" component={PetEditRequestDetailsScreen} />
      <Stack.Screen name="ProductCatalog" component={ProductCatalogScreen} />
      <Stack.Screen name="ProductCheckout" component={ProductCheckoutScreen} />
      <Stack.Screen name="ProductOrders" component={ProductOrdersScreen} />
      <Stack.Screen name="ProductOrderDetails" component={ProductOrderDetailsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="QR" component={QRScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
