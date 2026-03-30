import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/AppContext';

const PAYMENT_METHODS = ['Venmo', 'Zelle', 'Bank Transfer'];
const CLOTHES_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export default function CompleteProfileScreen() {
  const insets = useSafeAreaInsets();
  const { updateProfile } = useApp();
  const { pendingCode } = useLocalSearchParams<{ pendingCode?: string }>();

  const [birthdayDay, setBirthdayDay] = useState('');
  const [birthdayMonth, setBirthdayMonth] = useState('');
  const [birthdayYear, setBirthdayYear] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentHandle, setPaymentHandle] = useState('');
  const [shoeSize, setShoeSize] = useState('');
  const [clothesSize, setClothesSize] = useState('');
  const [waistSize, setWaistSize] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const navigateNext = (code?: string | string[]) => {
    const code_ = Array.isArray(code) ? code[0] : code;
    if (code_) {
      router.replace(`/join/${code_}`);
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleSave = async () => {
    if (!birthdayDay || !birthdayMonth || !birthdayYear) {
      setError('Birthday is required');
      return;
    }
    const day = birthdayDay.padStart(2, '0');
    const month = birthdayMonth.padStart(2, '0');
    const birthday = `${birthdayYear}-${month}-${day}`;

    setSaving(true);
    setError('');
    try {
      await updateProfile({
        birthday,
        paymentMethod: paymentMethod || '',
        paymentHandle: paymentHandle.trim(),
        shoeSize: shoeSize.trim(),
        clothesSize,
        waistSize: waistSize.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigateNext(pendingCode);
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigateNext(pendingCode);
  };

  const handleMethodPress = (m: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPaymentMethod((prev) => (prev === m ? '' : m));
  };

  const handleClothesSizePress = (s: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setClothesSize((prev) => (prev === s ? '' : s));
  };

  const paymentPlaceholder =
    paymentMethod === 'Venmo' ? '@yourhandle'
    : paymentMethod === 'Zelle' ? 'Email or phone number'
    : paymentMethod === 'Bank Transfer' ? 'Account / routing details'
    : 'Username, email, or account number';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepBadgeRow}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepText}>Step 2 of 2</Text>
          </View>
        </View>

        <View style={styles.iconWrap}>
          <View style={styles.iconCircle}>
            <Ionicons name="person" size={36} color={Colors.white} />
          </View>
        </View>

        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>
          Help your friends coordinate the perfect gift for you.
        </Text>

        {/* Birthday - mandatory */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Birthday <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.dateRow}>
            <View style={styles.dateInputWrap}>
              <TextInput
                style={styles.dateInput}
                value={birthdayDay}
                onChangeText={(t) => setBirthdayDay(t.replace(/[^0-9]/g, '').slice(0, 2))}
                placeholder="DD"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={styles.dateLabel}>Day</Text>
            </View>
            <Text style={styles.dateSep}>/</Text>
            <View style={styles.dateInputWrap}>
              <TextInput
                style={styles.dateInput}
                value={birthdayMonth}
                onChangeText={(t) => setBirthdayMonth(t.replace(/[^0-9]/g, '').slice(0, 2))}
                placeholder="MM"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={styles.dateLabel}>Month</Text>
            </View>
            <Text style={styles.dateSep}>/</Text>
            <View style={[styles.dateInputWrap, { flex: 1.5 }]}>
              <TextInput
                style={styles.dateInput}
                value={birthdayYear}
                onChangeText={(t) => setBirthdayYear(t.replace(/[^0-9]/g, '').slice(0, 4))}
                placeholder="YYYY"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="number-pad"
                maxLength={4}
              />
              <Text style={styles.dateLabel}>Year</Text>
            </View>
          </View>
        </View>

        {/* Payment method */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Payment Method</Text>
          <View style={styles.chipsRow}>
            {PAYMENT_METHODS.map((m) => (
              <Pressable
                key={m}
                style={[styles.chip, paymentMethod === m && styles.chipSelected]}
                onPress={() => handleMethodPress(m)}
              >
                <Text style={[styles.chipText, paymentMethod === m && styles.chipTextSelected]}>
                  {m}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Payment handle */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Payment Handle / Account</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="card-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={paymentHandle}
              onChangeText={setPaymentHandle}
              placeholder={paymentPlaceholder}
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Shoe size */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Shoe Size <Text style={styles.optional}>(optional)</Text>
          </Text>
          <View style={styles.inputWrap}>
            <Ionicons name="footsteps-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={shoeSize}
              onChangeText={setShoeSize}
              placeholder="e.g., 10"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>
        </View>

        {/* Clothes size */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Clothes Size <Text style={styles.optional}>(optional)</Text>
          </Text>
          <View style={styles.chipsRow}>
            {CLOTHES_SIZES.map((s) => (
              <Pressable
                key={s}
                style={[styles.chip, clothesSize === s && styles.chipSelected]}
                onPress={() => handleClothesSizePress(s)}
              >
                <Text style={[styles.chipText, clothesSize === s && styles.chipTextSelected]}>
                  {s}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Waist size */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Waist Size <Text style={styles.optional}>(optional)</Text>
          </Text>
          <View style={styles.inputWrap}>
            <Ionicons name="resize-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={waistSize}
              onChangeText={setWaistSize}
              placeholder="e.g., 32"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="default"
            />
          </View>
        </View>

        {!!error && (
          <View style={styles.errorWrap}>
            <Ionicons name="alert-circle" size={16} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            saving && styles.buttonDisabled,
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.buttonText}>Save & Continue</Text>
          )}
        </Pressable>

        <Pressable onPress={handleSkip} style={styles.skipWrap}>
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>

        <View style={styles.reminderCard}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.accent} />
          <Text style={styles.reminderText}>
            Your friends need your birthday and payment info to coordinate gifts. You can always add it later in your profile.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: 24,
  },
  stepBadgeRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  stepBadge: {
    backgroundColor: Colors.primarySoft,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.accentLight,
  },
  stepText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  iconWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
    marginBottom: 8,
  },
  required: {
    color: Colors.danger,
  },
  optional: {
    fontFamily: 'Inter_400Regular',
    color: Colors.textTertiary,
    fontSize: 13,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateInputWrap: {
    flex: 1,
    alignItems: 'center',
  },
  dateInput: {
    height: 52,
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 8,
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    textAlign: 'center',
  },
  dateLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.textTertiary,
    marginTop: 4,
  },
  dateSep: {
    fontSize: 20,
    fontFamily: 'Inter_400Regular',
    color: Colors.textTertiary,
    marginBottom: 18,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.white,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  errorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.danger,
    flex: 1,
  },
  button: {
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
  skipWrap: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 16,
  },
  skipText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.primarySoft,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.accentLight,
  },
  reminderText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.primary,
    lineHeight: 19,
  },
});
