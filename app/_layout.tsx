import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { TabsProvider } from '../src/browser/TabContext';
import { DownloadsProvider } from '../src/downloads/DownloadContext';
import { SitePermissionProvider } from '../src/permissions/SitePermissionContext';
import { SettingsProvider } from '../src/settings/SettingsContext';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { initDatabase } from '../src/storage/database';

function ThemedShell() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="bookmarks" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="history" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="settings" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="downloads" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="privacy" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="permissions" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="converter" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="work" options={{ headerShown: false, presentation: 'card' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void initDatabase();
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <ThemeProvider>
            <TabsProvider>
              <DownloadsProvider>
                <SitePermissionProvider>
                  <ThemedShell />
                </SitePermissionProvider>
              </DownloadsProvider>
            </TabsProvider>
          </ThemeProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
