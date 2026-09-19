import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts, Baloo2_700Bold, Baloo2_600SemiBold } from '@expo-google-fonts/baloo-2';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { View, ActivityIndicator } from 'react-native';

import MapScreen from './screens/MapScreen';
import CustomizeScreen from './screens/CustomizeScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import FriendsScreen from './screens/FriendsScreen';
import { colors } from './utils/theme';
import { UserProvider, useUser } from './context/UserContext';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { loading } = useUser();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accentAmber} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Map" component={MapScreen} />
        <Stack.Screen name="Customize" component={CustomizeScreen} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
        <Stack.Screen name="Friends" component={FriendsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Baloo2_700Bold,
    Baloo2_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accentAmber} size="large" />
      </View>
    );
  }

  // UserProvider signs the user in anonymously and loads/creates their
  // Firestore profile BEFORE the navigator mounts, so every screen can
  // safely assume a signed-in user with a profile is already available.
  return (
    <UserProvider>
      <AppNavigator />
    </UserProvider>
  );
}
