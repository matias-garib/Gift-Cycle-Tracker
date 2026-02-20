import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  TextInput, Alert, Modal, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/AppContext';
import { getInitials, timeSince } from '@/lib/helpers';

export default function GiftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const {
    user, getGiftById, getGroupById, getUserById,
    addWishlistItem, removeWishlistItem, markPurchased, markPaid,
  } = useApp();

  const gift = getGiftById(id!);
  const group = gift ? getGroupById(gift.groupId) : undefined;
  const birthdayPerson = gift ? getUserById(gift.birthdayPersonId) : undefined;
  const buyer = gift?.buyerId ? getUserById(gift.buyerId) : undefined;

  const [showAddWish, setShowAddWish] = useState(false);
  const [wishTitle, setWishTitle] = useState('');
  const [wishUrl, setWishUrl] = useState('');

  const [showPurchase, setShowPurchase] = useState(false);
  const [purchaseItem, setPurchaseItem] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [purchasing, setPurchasing] = useState(false);

  if (!gift || !group || !user) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.notFound}>Gift not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isBirthdayPerson = user.id === gift.birthdayPersonId;
  const isBuyer = user.id === gift.buyerId;
  const myPayment = gift.payments.find((p) => p.userId === user.id);
  const paidCount = gift.payments.filter((p) => p.paid).length;
  const unpaidCount = gift.payments.filter((p) => !p.paid).length;

  const handleAddWish = async () => {
    if (!wishTitle.trim()) return;
    await addWishlistItem(gift.id, {
      title: wishTitle.trim(),
      url: wishUrl.trim() || undefined,
      addedBy: user.id,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAddWish(false);
    setWishTitle('');
    setWishUrl('');
  };

  const handlePurchase = async () => {
    if (!purchaseItem.trim() || !purchaseCost.trim()) return;
    const cost = parseFloat(purchaseCost);
    if (isNaN(cost) || cost <= 0) {
      Alert.alert('Invalid', 'Please enter a valid cost');
      return;
    }
    setPurchasing(true);
    try {
      await markPurchased(gift.id, purchaseItem.trim(), cost);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowPurchase(false);
      setPurchaseItem('');
      setPurchaseCost('');
    } catch {
      Alert.alert('Error', 'Could not mark as purchased');
    } finally {
      setPurchasing(false);
    }
  };

  const handleMarkPaid = async () => {
    Alert.alert('Confirm Payment', 'Mark yourself as paid?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, I Paid',
        onPress: async () => {
          await markPaid(gift.id, user.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
          { paddingTop: insets.top + webTop + 8, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </Pressable>

        <View style={styles.headerCard}>
          <View style={[styles.phaseIndicator]}>
            <View style={[styles.phaseDot, gift.phase === 'ideation' && styles.phaseActive]} />
            <View style={styles.phaseLine} />
            <View style={[styles.phaseDot, gift.phase === 'payment' && styles.phaseActive, gift.phase === 'settlement' && styles.phaseComplete]} />
            <View style={styles.phaseLine} />
            <View style={[styles.phaseDot, gift.phase === 'settlement' && styles.phaseActive]} />
          </View>
          <View style={styles.phaseLabels}>
            <Text style={[styles.phaseLabel, gift.phase === 'ideation' && styles.phaseLabelActive]}>Wishlist</Text>
            <Text style={[styles.phaseLabel, (gift.phase === 'payment' || gift.phase === 'settlement') && styles.phaseLabelActive]}>Purchased</Text>
            <Text style={[styles.phaseLabel, gift.phase === 'settlement' && styles.phaseLabelActive]}>Settlement</Text>
          </View>

          {birthdayPerson && (
            <View style={styles.personRow}>
              <View style={[styles.personAvatar, { backgroundColor: birthdayPerson.avatarColor }]}>
                <Text style={styles.personAvatarText}>{getInitials(birthdayPerson.name)}</Text>
              </View>
              <View>
                <Text style={styles.personLabel}>Gift for</Text>
                <Text style={styles.personName}>{birthdayPerson.name}</Text>
              </View>
            </View>
          )}

          {gift.totalCost !== undefined && (
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Total Cost</Text>
              <Text style={styles.costValue}>${gift.totalCost.toFixed(2)}</Text>
            </View>
          )}
        </View>

        {gift.phase === 'ideation' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Wishlist</Text>
              {isBirthdayPerson && (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowAddWish(true);
                  }}
                >
                  <Ionicons name="add-circle" size={26} color={Colors.primary} />
                </Pressable>
              )}
            </View>

            {gift.wishlist.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="list-outline" size={28} color={Colors.textTertiary} />
                <Text style={styles.emptyText}>
                  {isBirthdayPerson
                    ? 'Add items to your wishlist!'
                    : 'Waiting for the birthday person to add wishes'}
                </Text>
              </View>
            ) : (
              <View style={styles.wishList}>
                {gift.wishlist.map((item) => (
                  <View key={item.id} style={styles.wishItem}>
                    <Ionicons name="gift-outline" size={18} color={Colors.accent} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.wishTitle}>{item.title}</Text>
                      {item.url ? (
                        <Text style={styles.wishUrl} numberOfLines={1}>{item.url}</Text>
                      ) : null}
                    </View>
                    {isBirthdayPerson && item.addedBy === user.id && (
                      <Pressable
                        onPress={() => {
                          removeWishlistItem(gift.id, item.id);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            )}

            {!isBirthdayPerson && gift.wishlist.length > 0 && (
              <Pressable
                style={({ pressed }) => [styles.purchaseBtn, pressed && { opacity: 0.85 }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowPurchase(true);
                }}
              >
                <Ionicons name="cart" size={18} color={Colors.white} />
                <Text style={styles.purchaseBtnText}>Mark as Purchased</Text>
              </Pressable>
            )}
          </View>
        )}

        {gift.phase === 'settlement' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Purchase Details</Text>
              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Item</Text>
                  <Text style={styles.detailValue}>{gift.purchasedItem}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Cost</Text>
                  <Text style={styles.detailValue}>${gift.totalCost?.toFixed(2)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Split Per Person</Text>
                  <Text style={styles.detailValue}>
                    ${gift.payments.length > 0 ? gift.payments[0].amount.toFixed(2) : '0.00'}
                  </Text>
                </View>
                {buyer && (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Purchased By</Text>
                      <Text style={styles.detailValue}>{buyer.name}</Text>
                    </View>
                    {buyer.paymentHandle && (
                      <View style={styles.paymentInfoBox}>
                        <Ionicons name="card" size={18} color={Colors.primary} style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.payMethodLabel}>Payment Details</Text>
                          <Text style={styles.payHandleText} selectable>{buyer.paymentHandle}</Text>
                        </View>
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>

            {myPayment && !myPayment.paid && !isBuyer && !isBirthdayPerson && (
              <Pressable
                style={({ pressed }) => [styles.payBtn, pressed && { opacity: 0.85 }]}
                onPress={handleMarkPaid}
              >
                <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                <Text style={styles.payBtnText}>
                  I Have Paid ${myPayment.amount.toFixed(2)}
                </Text>
              </Pressable>
            )}

            {myPayment?.paid && (
              <View style={styles.paidBanner}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                <Text style={styles.paidBannerText}>You have paid your share</Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Payment Status ({paidCount}/{gift.payments.length})
              </Text>

              <View style={styles.progressBarBig}>
                <View style={[styles.progressFillBig, { width: `${gift.payments.length > 0 ? (paidCount / gift.payments.length) * 100 : 0}%` }]} />
              </View>

              <View style={styles.paymentList}>
                {gift.payments
                  .sort((a, b) => (a.paid === b.paid ? 0 : a.paid ? -1 : 1))
                  .map((payment) => {
                    const payUser = getUserById(payment.userId);
                    return (
                      <View key={payment.userId} style={styles.paymentRow}>
                        <View style={[styles.payAvatar, { backgroundColor: payUser?.avatarColor || Colors.accent }]}>
                          <Text style={styles.payAvatarText}>
                            {payUser ? getInitials(payUser.name) : '?'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.payName}>
                            {payUser?.name || 'Unknown'}
                            {payment.userId === user.id ? ' (You)' : ''}
                          </Text>
                          <Text style={styles.payAmount}>${payment.amount.toFixed(2)}</Text>
                        </View>
                        <View style={[
                          styles.statusChip,
                          payment.paid ? styles.statusPaid : styles.statusUnpaid,
                        ]}>
                          <Ionicons
                            name={payment.paid ? 'checkmark' : 'time'}
                            size={14}
                            color={payment.paid ? Colors.primary : Colors.danger}
                          />
                          <Text style={[
                            styles.statusText,
                            payment.paid ? styles.statusPaidText : styles.statusUnpaidText,
                          ]}>
                            {payment.paid ? 'Paid' : 'In Debt'}
                          </Text>
                        </View>
                        {payment.paid && payment.paidAt && (
                          <Text style={styles.paidTime}>{timeSince(payment.paidAt)}</Text>
                        )}
                      </View>
                    );
                  })}
              </View>

              {unpaidCount > 0 && (
                <View style={styles.reminderBox}>
                  <Ionicons name="notifications-outline" size={18} color={Colors.warning} />
                  <Text style={styles.reminderText}>
                    {unpaidCount} member{unpaidCount > 1 ? 's' : ''} still owe{unpaidCount === 1 ? 's' : ''}. Reminders sent after 48h.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={showAddWish} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddWish(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Add to Wishlist</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Item name"
              placeholderTextColor={Colors.textTertiary}
              value={wishTitle}
              onChangeText={setWishTitle}
              autoFocus
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Link (optional)"
              placeholderTextColor={Colors.textTertiary}
              value={wishUrl}
              onChangeText={setWishUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalCancel, pressed && { opacity: 0.7 }]}
                onPress={() => setShowAddWish(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalSubmit, pressed && { opacity: 0.85 }, !wishTitle.trim() && { opacity: 0.5 }]}
                onPress={handleAddWish}
                disabled={!wishTitle.trim()}
              >
                <Text style={styles.modalSubmitText}>Add</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showPurchase} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowPurchase(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Mark as Purchased</Text>
            <Text style={styles.modalSub}>
              The cost will be split among {group.members.length - 1} members
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="What did you buy?"
              placeholderTextColor={Colors.textTertiary}
              value={purchaseItem}
              onChangeText={setPurchaseItem}
              autoFocus
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Total cost ($)"
              placeholderTextColor={Colors.textTertiary}
              value={purchaseCost}
              onChangeText={setPurchaseCost}
              keyboardType="decimal-pad"
            />
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalCancel, pressed && { opacity: 0.7 }]}
                onPress={() => setShowPurchase(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalSubmit,
                  pressed && { opacity: 0.85 },
                  (!purchaseItem.trim() || !purchaseCost.trim()) && { opacity: 0.5 },
                ]}
                onPress={handlePurchase}
                disabled={!purchaseItem.trim() || !purchaseCost.trim() || purchasing}
              >
                {purchasing ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.modalSubmitText}>Confirm</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 16, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  backLink: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.primary, marginTop: 8 },
  scroll: { padding: 20 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 20,
  },
  phaseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  phaseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.border,
  },
  phaseActive: {
    backgroundColor: Colors.primary,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  phaseComplete: {
    backgroundColor: Colors.accentLight,
  },
  phaseLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    maxWidth: 80,
  },
  phaseLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  phaseLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: Colors.textTertiary,
  },
  phaseLabelActive: {
    color: Colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
  },
  personAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personAvatarText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
  personLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
  },
  personName: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
  },
  costLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
  },
  costValue: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
    marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  wishList: { gap: 6 },
  wishItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  wishTitle: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: Colors.text,
  },
  wishUrl: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.accent,
    marginTop: 2,
  },
  purchaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 12,
  },
  purchaseBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
  detailCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  paymentInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primarySoft,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  payMethodLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
    marginBottom: 4,
  },
  payHandleText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.primaryLight,
    lineHeight: 20,
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 20,
  },
  payBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
  paidBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primarySoft,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.accentLight,
  },
  paidBannerText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  progressBarBig: {
    height: 8,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFillBig: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  paymentList: { gap: 6 },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  payAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  payAvatarText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
  payName: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: Colors.text,
  },
  payAmount: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 6,
  },
  statusPaid: {
    backgroundColor: Colors.primarySoft,
  },
  statusUnpaid: {
    backgroundColor: Colors.dangerLight,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  statusPaidText: {
    color: Colors.primary,
  },
  statusUnpaidText: {
    color: Colors.danger,
  },
  paidTime: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: Colors.textTertiary,
    marginLeft: 6,
  },
  reminderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.warningLight,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  reminderText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.warning,
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
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  modalInput: {
    height: 48,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  modalCancelText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary,
  },
  modalSubmit: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  modalSubmitText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
});
