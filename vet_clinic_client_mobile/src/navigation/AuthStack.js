import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import VerifyOtpScreen from '../screens/VerifyOtpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import { useMotion } from '../context/MotionContext';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  const { reduceMotion } = useMotion();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: reduceMotion ? 'none' : 'fade_from_bottom' }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}
