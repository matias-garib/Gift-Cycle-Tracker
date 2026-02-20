import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  TextInput, Image, Linking, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/AppContext';
import { getInitials, formatBirthdayDisplay } from '@/lib/helpers';

const CLOTHES_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateProfile, logout, groups, seedDemoData, addProfileWishlistItem, removeProfileWishlistItem } = useApp();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [birthdayDay, setBirthdayDay] = useState('');
  const [birthdayMonth, setBirthdayMonth] = useState('');
  const [birthdayYear, setBirthdayYear] = useState('');
  const [paymentInfo, setPaymentInfo] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [shoeSize, setShoeSize] = useState('');
  const [clothesSize, setClothesSize] = useState('');
  const [waistSize, setWaistSize] = useState('');
  const [showAddWish, setShowAddWish] = useState(false);
  const [wishTitle, setWishTitle] = useState('');
  const [wishUrl, setWishUrl] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      if (user.birthday) {
        const parts = user.birthday.split('-');
        if (parts.length === 3) {
          setBirthdayYear(parts[0]);
          setBirthdayMonth(parts[1]);
          setBirthdayDay(parts[2]);
        }
      }
      setPaymentInfo(user.paymentHandle || '');
      setShoeSize(user.shoeSize || '');
      setClothesSize(user.clothesSize || '');
      setWaistSize(user.waistSize || '');
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
    let birthday = '';
    if (birthdayDay && birthdayMonth && birthdayYear) {
      const day = birthdayDay.padStart(2, '0');
      const month = birthdayMonth.padStart(2, '0');
      birthday = `${birthdayYear}-${month}-${day}`;
    }
    await updateProfile({
      name: name.trim(),
      birthday,
      paymentMethod: paymentInfo.trim() ? 'Bank Transfer' : '',
      paymentHandle: paymentInfo.trim(),
      shoeSize: shoeSize.trim(),
      clothesSize,
      waistSize: waistSize.trim(),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditing(false);
  };

  const handleAddWishlistItem = async () => {
    if (!wishTitle.trim()) return;
    await addProfileWishlistItem({
      title: wishTitle.trim(),
      url: wishUrl.trim() || undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setWishTitle('');
    setWishUrl('');
    setShowAddWish(false);
  };

  const handleRemoveWishlistItem = async (itemId: string) => {
    await removeProfileWishlistItem(itemId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/auth');
  };

  const webTop = Platform.OS === 'web' ? 67 : 0;
  const wishlistItems = user.wishlist || [];

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
          <Pressable onPress={async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });
            if (!result.canceled && result.assets[0]) {
              await updateProfile({ profileImage: result.assets[0].uri });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }} style={styles.avatarWrap}>
            {user.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.bigAvatarImg} />
            ) : (
              <View style={[styles.bigAvatar, { backgroundColor: user.avatarColor }]}>
                <Text style={styles.bigAvatarText}>{getInitials(user.name)}</Text>
              </View>
            )}
            <View style={styles.avatarCameraBtn}>
              <Ionicons name="camera" size={14} color={Colors.white} />
            </View>
          </Pressable>
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
          ) : (
            <View style={styles.fieldRow}>
              <Ionicons name="calendar-outline" size={18} color={Colors.accent} />
              <Text style={styles.fieldValue}>
                {user.birthday ? formatBirthdayDisplay(user.birthday) : 'Not set'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <Text style={styles.sectionHint}>
            Enter your full payment/bank transfer details so others know where to send money
          </Text>
          {editing ? (
            <TextInput
              style={styles.paymentInput}
              value={paymentInfo}
              onChangeText={setPaymentInfo}
              placeholder={"e.g., Venmo: @yourname\nor\nBank: Banco Estado\nAccount: 1234567890\nRUT: 12.345.678-9\nType: Cuenta Vista\nEmail: your@email.com"}
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          ) : (
            <View style={styles.fieldRow}>
              <Ionicons name="card-outline" size={18} color={Colors.accent} />
              <Text style={styles.fieldValue}>
                {user.paymentHandle || 'Not set'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Wishlist</Text>
          <Text style={styles.sectionHint}>
            Add gift ideas so your friends know what to get you
          </Text>
          {wishlistItems.map((item) => (
            <View key={item.id} style={styles.wishlistItem}>
              <View style={styles.wishlistItemContent}>
                <Text style={styles.wishlistItemTitle}>{item.title}</Text>
                {item.url ? (
                  <Pressable onPress={() => Linking.openURL(item.url!)}>
                    <Text style={styles.wishlistItemUrl} numberOfLines={1}>{item.url}</Text>
                  </Pressable>
                ) : null}
              </View>
              <Pressable
                onPress={() => handleRemoveWishlistItem(item.id)}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={22} color={Colors.textTertiary} />
              </Pressable>
            </View>
          ))}
          <Pressable
            style={({ pressed }) => [styles.addWishBtn, pressed && { opacity: 0.85 }]}
            onPress={() => setShowAddWish(true)}
          >
            <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.addWishBtnText}>Add Item</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sizes</Text>
          <Text style={styles.sectionHint}>
            Optional - helps friends pick the right size
          </Text>
          {editing ? (
            <View style={styles.sizesEditContainer}>
              <View style={styles.sizeFieldWrap}>
                <Text style={styles.sizeFieldLabel}>Shoe Size</Text>
                <TextInput
                  style={styles.sizeInput}
                  value={shoeSize}
                  onChangeText={setShoeSize}
                  placeholder="e.g., 10"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="default"
                />
              </View>
              <View style={styles.sizeFieldWrap}>
                <Text style={styles.sizeFieldLabel}>Clothes Size</Text>
                <View style={styles.chipsRow}>
                  {CLOTHES_SIZES.map((size) => (
                    <Pressable
                      key={size}
                      style={[
                        styles.chip,
                        clothesSize === size && styles.chipSelected,
                      ]}
                      onPress={() => setClothesSize(clothesSize === size ? '' : size)}
                    >
                      <Text style={[
                        styles.chipText,
                        clothesSize === size && styles.chipTextSelected,
                      ]}>{size}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.sizeFieldWrap}>
                <Text style={styles.sizeFieldLabel}>Waist Size</Text>
                <TextInput
                  style={styles.sizeInput}
                  value={waistSize}
                  onChangeText={setWaistSize}
                  placeholder="e.g., 32"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="default"
                />
              </View>
            </View>
          ) : (
            <View style={styles.sizesViewContainer}>
              <View style={styles.sizeViewRow}>
                <Text style={styles.sizeViewLabel}>Shoe Size</Text>
                <Text style={styles.sizeViewValue}>{user.shoeSize || 'Not set'}</Text>
              </View>
              <View style={styles.sizeViewRow}>
                <Text style={styles.sizeViewLabel}>Clothes Size</Text>
                <Text style={styles.sizeViewValue}>{user.clothesSize || 'Not set'}</Text>
              </View>
              <View style={styles.sizeViewRow}>
                <Text style={styles.sizeViewLabel}>Waist Size</Text>
                <Text style={styles.sizeViewValue}>{user.waistSize || 'Not set'}</Text>
              </View>
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

        {showLogoutConfirm ? (
          <View style={styles.logoutConfirm}>
            <Text style={styles.logoutConfirmText}>Are you sure you want to sign out?</Text>
            <View style={styles.logoutConfirmActions}>
              <Pressable
                style={({ pressed }) => [styles.logoutCancelBtn, pressed && { opacity: 0.85 }]}
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={styles.logoutCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.logoutConfirmBtn, pressed && { opacity: 0.85 }]}
                onPress={handleLogout}
              >
                <Text style={styles.logoutConfirmBtnText}>Sign Out</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.85 }]}
            onPress={() => setShowLogoutConfirm(true)}
          >
            <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </Pressable>
        )}
      </ScrollView>

      <Modal
        visible={showAddWish}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddWish(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Wishlist Item</Text>
              <Pressable onPress={() => { setShowAddWish(false); setWishTitle(''); setWishUrl(''); }}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.modalLabel}>Item name *</Text>
            <TextInput
              style={styles.modalInput}
              value={wishTitle}
              onChangeText={setWishTitle}
              placeholder="e.g., AirPods Pro"
              placeholderTextColor={Colors.textTertiary}
              autoFocus
            />
            <Text style={styles.modalLabel}>Link (optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={wishUrl}
              onChangeText={setWishUrl}
              placeholder="https://..."
              placeholderTextColor={Colors.textTertiary}
              keyboardType="url"
              autoCapitalize="none"
            />
            <Pressable
              style={({ pressed }) => [
                styles.modalAddBtn,
                !wishTitle.trim() && styles.modalAddBtnDisabled,
                pressed && { opacity: 0.85 },
              ]}
              onPress={handleAddWishlistItem}
              disabled={!wishTitle.trim()}
            >
              <Text style={styles.modalAddBtnText}>Add Item</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  avatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  bigAvatarImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarCameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.card,
  },
  bigAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
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
  sectionHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textTertiary,
    marginBottom: 10,
    lineHeight: 17,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  fieldValue: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
    flex: 1,
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
    height: 48,
    width: '100%',
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'center',
  },
  dateLabel: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: Colors.textTertiary,
    marginTop: 4,
  },
  dateSep: {
    fontSize: 20,
    fontFamily: 'Inter_400Regular',
    color: Colors.textTertiary,
    marginBottom: 16,
  },
  paymentInput: {
    minHeight: 120,
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    lineHeight: 22,
  },
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
  wishlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  wishlistItemContent: {
    flex: 1,
    marginRight: 8,
  },
  wishlistItemTitle: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: Colors.text,
  },
  wishlistItemUrl: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.primary,
    marginTop: 2,
    textDecorationLine: 'underline',
  },
  addWishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
    backgroundColor: Colors.primarySoft,
    borderRadius: 10,
  },
  addWishBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  sizesEditContainer: {
    gap: 14,
  },
  sizeFieldWrap: {
    gap: 6,
  },
  sizeFieldLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
  },
  sizeInput: {
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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.white,
  },
  sizesViewContainer: {
    gap: 8,
  },
  sizeViewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sizeViewLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
  },
  sizeViewValue: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  modalLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  modalInput: {
    height: 44,
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  modalAddBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  modalAddBtnDisabled: {
    opacity: 0.5,
  },
  modalAddBtnText: {
    fontSize: 15,
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
  logoutConfirm: {
    backgroundColor: Colors.dangerLight,
    borderRadius: 14,
    padding: 20,
    marginTop: 12,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#E8C4C4',
  },
  logoutConfirmText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: Colors.danger,
    textAlign: 'center',
  },
  logoutConfirmActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  logoutCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: Colors.card,
  },
  logoutCancelText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary,
  },
  logoutConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: Colors.danger,
  },
  logoutConfirmBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
});
