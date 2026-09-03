import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { missingKeys } from './src/config/env';
import type { RootStackParamList } from './src/navigation/types';
import UserDetailScreen from './src/screens/UserDetailScreen';
import UsersScreen from './src/screens/UsersScreen';
import { adminTheme } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: adminTheme.accent,
    background: adminTheme.background,
    card: adminTheme.surface,
    text: adminTheme.text,
    border: adminTheme.border,
  },
};

function MisconfiguredBuild({ missing }: { missing: string[] }) {
  return (
    <View style={styles.blocked}>
      <Text style={styles.blockedTitle}>This build is missing its API keys</Text>
      <Text style={styles.blockedBody}>
        {missing.join('\n')}
        {'\n\n'}Set them as EAS environment variables (sensitive) on the preview and production environments, or in a local .env, then rebuild or republish.
      </Text>
    </View>
  );
}

export default function App() {
  const missing = missingKeys();
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {missing.length > 0 ? (
        <MisconfiguredBuild missing={missing} />
      ) : (
        <NavigationContainer theme={navTheme}>
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: adminTheme.surface },
              headerTintColor: adminTheme.text,
              contentStyle: { backgroundColor: adminTheme.background },
            }}
          >
            <Stack.Screen name="Users" component={UsersScreen} options={{ title: 'Users' }} />
            <Stack.Screen
              name="UserDetail"
              component={UserDetailScreen}
              options={({ route }) => ({ title: `User ${route.params.user.idusers}` })}
            />
          </Stack.Navigator>
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  blocked: { flex: 1, backgroundColor: adminTheme.background, justifyContent: 'center', padding: 24 },
  blockedTitle: { color: adminTheme.accent, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  blockedBody: { color: adminTheme.text, fontSize: 14, lineHeight: 20 },
});
