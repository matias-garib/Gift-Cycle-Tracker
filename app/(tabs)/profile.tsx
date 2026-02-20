import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  TextInput, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/AppContext';
import { getInitials, formatFullDate } from '@/lib/helpers';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateProfile, logout, groups, seedDemoData } = useApp();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentHandle, setPaymentHandle] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setBirthday(user.birthday);
      setPaymentMethod(user.paymentMethod);
      setPaymentHandle(user.paymentHandle);
    }
  }, [user]);

  if (!user) {
    return (
      <View style={[styles.container, styles.center]}>
        <Pressable
          style={({ pressed }) => [styles.loginBtn, pressed && { opacity: 0.85 }]}
          onPress={() => router.push('/auth')}
        >
          <Text style={styles.loginBtnText}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  const handleSave = async () => {
    await updateProfile({
      name: name.trim(),
      birthday: birthday.trim(),
      paymentMethod: paymentMethod.trim(),
      paymentHandle: paymentHandle.trim(),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditing(false);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/auth');
        },
      },
    ]);
  };

  const webTop = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + webTop + 16, paddingBottom: insets.bottom + 100 },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <Pressable
            onPress={() => {
              if (editing) {
                handleSave();
              } else {
                setEditing(true);
              }
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text style={styles.editBtn}>{editing ? 'Save' : 'Edit'}</Text>
          </Pressable>
        </View>

        <View style={styles.profileCard}>
          <View style={[styles.bigAvatar, { backgroundColor: user.avatarColor }]}>
            <Text style={styles.bigAvatarText}>{getInitials(user.name)}</Text>
          </View>
          {editing ? (
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={Colors.textTertiary}
            />
          ) : (
            <Text style={styles.profileName}>{user.name}</Text>
          )}
          <Text style={styles.profileEmail}>{user.email}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Birthday</Text>
          {editing ? (
            <TextInput
              style={styles.fieldInput}
              value={birthday}
              onChangeText={setBirthday}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textTertiary}
            />
          ) : (
            <View style={styles.fieldRow}>
              <Ionicons name="calendar-outline" size={18} color={Colors.accent} />
              <Text style={styles.fieldValue}>
                {user.birthday ? formatFullDate(user.birthday) : 'Not set'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Info</Text>
          {editing ? (
            <View style={styles.paymentEdit}>
              <TextInput
                style={styles.fieldInput}
                value={paymentMethod}
                onChangeText={setPaymentMethod}
                placeholder="Method (e.g., Venmo, Zelle)"
                placeholderTextColor={Colors.textTertiary}
              />
              <TextInput
                style={styles.fieldInput}
                value={paymentHandle}
                onChangeText={setPaymentHandle}
                placeholder="Handle (e.g., @yourname)"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          ) : (
            <View style={styles.paymentInfo}>
              <View style={styles.fieldRow}>
                <Ionicons name="card-outline" size={18} color={Colors.accent} />
                <Text style={styles.fieldValue}>
                  {user.paymentMethod || 'Not set'}
                </Text>
              </View>
              {user.paymentHandle ? (
                <View style={styles.fieldRow}>
                  <Ionicons name="at-outline" size={18} color={Colors.accent} />
                  <Text style={styles.fieldValue}>{user.paymentHandle}</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Groups</Text>
          <Text style={styles.fieldValue}>
            {groups.length} group{groups.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {groups.length === 0 && (
          <Pressable
            style={({ pressed }) => [styles.demoBtn, pressed && { opacity: 0.85 }]}
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await seedDemoData();
            }}
          >
            <Ionicons name="sparkles" size={18} color={Colors.primary} />
            <Text style={styles.demoBtnText}>Load Demo Data</Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.85 }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
  },
  editBtn: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 24,
  },
  bigAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  bigAvatarText: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
  },
  profileName: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  nameInput: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    paddingBottom: 4,
    minWidth: 200,
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldValue: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  fieldInput: {
    height: 44,
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paymentEdit: { gap: 10 },
  paymentInfo: { gap: 6 },
  loginBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  loginBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primarySoft,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.accentLight,
  },
  demoBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.dangerLight,
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
  },
  logoutText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.danger,
  },
});
