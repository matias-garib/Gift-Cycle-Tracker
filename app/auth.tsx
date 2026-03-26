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

const i18n = {
  en: {
    title: 'Welcome to GiftCycle',
    subtitle: 'Coordinate birthday gifts with your friends, without the WhatsApp chaos.',
    namePlaceholder: 'Your Name',
    emailPlaceholder: 'Email Address',
    passwordPlaceholder: 'Password',
    createAccount: 'Create Account',
    loginButton: 'Log In',
    switchToLogin: 'Already have an account? Log in',
    switchToRegister: "Don't have an account? Sign up",
    errorAllFields: 'Please fill in all fields',
    errorValidEmail: 'Please enter a valid email',
    errorGeneric: 'Something went wrong',
  },
  es: {
    title: 'Bienvenido a GiftCycle',
    subtitle: 'Coordina regalos de cumpleaños con tus amigos, sin el caos de WhatsApp.',
    namePlaceholder: 'Tu Nombre',
    emailPlaceholder: 'Correo Electrónico',
    passwordPlaceholder: 'Contraseña',
    createAccount: 'Crear Cuenta',
    loginButton: 'Iniciar Sesión',
    switchToLogin: '¿Ya tienes cuenta? Inicia sesión',
    switchToRegister: '¿No tienes cuenta? Regístrate',
    errorAllFields: 'Por favor, llena todos los campos',
    errorValidEmail: 'Por favor, ingresa un correo válido',
    errorGeneric: 'Algo salió mal',
  },
} as const;

type Lang = keyof typeof i18n;

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { login, register } = useApp();
  const { pendingCode } = useLocalSearchParams<{ pendingCode?: string }>();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lang, setLang] = useState<Lang>('en');

  const t = i18n[lang];

  const toggleLang = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLang((prev) => (prev === 'en' ? 'es' : 'en'));
    setError('');
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim() || (!isLogin && !name.trim())) {
      setError(t.errorAllFields);
      return;
    }
    if (!email.includes('@')) {
      setError(t.errorValidEmail);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      if (isLogin) {
        await login(email.trim().toLowerCase(), password);
      } else {
        await register(name.trim(), email.trim().toLowerCase(), password);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (pendingCode) {
        router.replace(`/join/${pendingCode}`);
      } else {
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      setError(e?.message || t.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.langToggle} onPress={toggleLang}>
          <Text style={[styles.langOption, lang === 'en' && styles.langActive]}>EN</Text>
          <View style={styles.langDivider} />
          <Text style={[styles.langOption, lang === 'es' && styles.langActive]}>ES</Text>
        </Pressable>

        <View style={styles.iconWrap}>
          <View style={styles.iconCircle}>
            <Ionicons name="gift" size={40} color={Colors.white} />
          </View>
        </View>

        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.subtitle}>{t.subtitle}</Text>

        <View style={styles.form}>
          {!isLogin && (
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t.namePlaceholder}
                placeholderTextColor={Colors.textTertiary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t.emailPlaceholder}
              placeholderTextColor={Colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t.passwordPlaceholder}
              placeholderTextColor={Colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
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
              submitting && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>{isLogin ? t.loginButton : t.createAccount}</Text>
            )}
          </Pressable>

          <Pressable onPress={() => { setIsLogin((v) => !v); setError(''); }}>
            <Text style={styles.switchText}>{isLogin ? t.switchToRegister : t.switchToLogin}</Text>
          </Pressable>
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
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  langToggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginBottom: 24,
  },
  langOption: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textTertiary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 7,
    overflow: 'hidden',
  },
  langActive: {
    color: Colors.white,
    backgroundColor: Colors.primary,
  },
  langDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.border,
  },
  iconWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
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
    paddingHorizontal: 16,
  },
  form: {
    gap: 14,
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
    marginTop: 8,
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
  switchText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
