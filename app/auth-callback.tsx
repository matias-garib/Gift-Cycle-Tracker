import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/AppContext';
import { getApiUrl } from '@/lib/query-client';

export default function AuthCallbackScreen() {
  const insets = useSafeAreaInsets();
  const { loginWithOAuth } = useApp();
  const [error, setError] = useState('');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL('/api/auth/me', baseUrl);
      const res = await fetch(url.toString(), { credentials: 'include' });
      const data = await res.json();

      if (data.authenticated && data.user) {
        await loginWithOAuth(data.user);
        router.replace('/(tabs)');
      } else {
        setError('Authentication failed. Please try again.');
        setTimeout(() => router.replace('/auth'), 2000);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setTimeout(() => router.replace('/auth'), 2000);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top }]}>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.text}>Completing sign in...</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  text: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: Colors.danger,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
