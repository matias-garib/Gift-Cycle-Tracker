import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Pressable, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/AppContext';

export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const insets = useSafeAreaInsets();
  const { user, joinGroup, loading } = useApp();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'login'>('loading');
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setStatus('login');
      return;
    }
    handleJoin();
  }, [loading, user]);

  const handleJoin = async () => {
    if (!code || !user) return;
    setStatus('loading');
    try {
      const group = await joinGroup(code);
      if (group) {
        setGroupName(group.name);
        setStatus('success');
        setTimeout(() => {
          router.replace(`/group/${group.id}`);
        }, 1500);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const webTop = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTop }]}>
      {status === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.message}>Joining group...</Text>
        </View>
      )}

      {status === 'login' && (
        <View style={styles.center}>
          <View style={styles.iconCircle}>
            <Ionicons name="person-outline" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.heading}>Sign in to join</Text>
          <Text style={styles.message}>Log in or create an account and you'll be added to the group automatically.</Text>
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
            onPress={() => router.replace(`/auth?pendingCode=${code}`)}
          >
            <Text style={styles.btnText}>Sign In / Create Account</Text>
          </Pressable>
        </View>
      )}

      {status === 'success' && (
        <View style={styles.center}>
          <View style={[styles.iconCircle, { backgroundColor: Colors.primarySoft }]}>
            <Ionicons name="checkmark-circle" size={42} color={Colors.primary} />
          </View>
          <Text style={styles.heading}>You're in!</Text>
          <Text style={styles.message}>Joined "{groupName}" successfully</Text>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.center}>
          <View style={[styles.iconCircle, { backgroundColor: Colors.dangerLight }]}>
            <Ionicons name="close-circle" size={42} color={Colors.danger} />
          </View>
          <Text style={styles.heading}>Invalid invite</Text>
          <Text style={styles.message}>This invite link is invalid or expired.</Text>
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.btnText}>Go Home</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heading: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
  },
  btn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
  },
  btnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
});
