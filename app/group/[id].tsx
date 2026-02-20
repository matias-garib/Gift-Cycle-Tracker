import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  Alert, Share, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/AppContext';
import { getInitials, getUpcomingBirthdays, formatDate, getDaysUntilBirthday } from '@/lib/helpers';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user, getGroupById, getGiftsForGroup, createGift } = useApp();
  const [showNewGift, setShowNewGift] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState('');
  const [creating, setCreating] = useState(false);

  const group = getGroupById(id!);
  const groupGifts = getGiftsForGroup(id!);

  const upcomingBirthdays = useMemo(() => {
    if (!group) return [];
    return getUpcomingBirthdays(
      group.members.filter((m) => m.birthday),
      30
    );
  }, [group]);

  if (!group || !user) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.notFound}>Group not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my GiftCycle group "${group.name}"! Use invite code: ${group.inviteCode}`,
      });
    } catch {
    }
  };

  const handleCreateGift = async () => {
    if (!selectedPerson) return;
    setCreating(true);
    try {
      const gift = await createGift(group.id, selectedPerson);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowNewGift(false);
      setSelectedPerson('');
      router.push(`/gift/${gift.id}`);
    } catch {
      Alert.alert('Error', 'Could not create gift');
    } finally {
      setCreating(false);
    }
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
          <View style={styles.groupIconBig}>
            <Ionicons name="people" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.memberCount}>
            {group.members.length} member{group.members.length !== 1 ? 's' : ''}
          </Text>

          <View style={styles.inviteRow}>
            <View style={styles.inviteCodeBox}>
              <Text style={styles.inviteLabel}>Invite Code</Text>
              <Text style={styles.inviteCode}>{group.inviteCode}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.85 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleShare();
              }}
            >
              <Ionicons name="share-outline" size={18} color={Colors.white} />
            </Pressable>
          </View>
        </View>

        {upcomingBirthdays.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Birthdays</Text>
            {upcomingBirthdays.map((member) => (
              <View key={member.id} style={styles.birthdayRow}>
                <View style={[styles.miniAvatar, { backgroundColor: member.avatarColor }]}>
                  <Text style={styles.miniAvatarText}>{getInitials(member.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberDate}>{formatDate(member.birthday)}</Text>
                </View>
                <View style={[
                  styles.daysChip,
                  member.daysUntil <= 3 && styles.daysUrgent,
                  member.daysUntil === 0 && styles.daysToday,
                ]}>
                  <Text style={[
                    styles.daysText,
                    member.daysUntil <= 3 && { color: Colors.warning },
                    member.daysUntil === 0 && { color: Colors.danger },
                  ]}>
                    {member.daysUntil === 0 ? 'Today!' : `${member.daysUntil}d`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Gifts</Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowNewGift(true);
              }}
            >
              <Ionicons name="add-circle" size={28} color={Colors.primary} />
            </Pressable>
          </View>

          {groupGifts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="gift-outline" size={32} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No gifts yet. Start one for an upcoming birthday!</Text>
            </View>
          ) : (
            <View style={styles.giftList}>
              {groupGifts.map((gift) => {
                const person = group.members.find((m) => m.id === gift.birthdayPersonId);
                const paidCount = gift.payments.filter((p) => p.paid).length;
                const totalCount = gift.payments.length;

                return (
                  <Pressable
                    key={gift.id}
                    style={({ pressed }) => [styles.giftCard, pressed && styles.cardPressed]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push(`/gift/${gift.id}`);
                    }}
                  >
                    <View style={styles.giftTop}>
                      <View style={[styles.phaseChip, gift.phase === 'settlement' && styles.phaseSettlement]}>
                        <Text style={[styles.phaseText, gift.phase === 'settlement' && { color: Colors.primary }]}>
                          {gift.phase === 'ideation' ? 'Wishlist' : gift.phase === 'payment' ? 'Purchasing' : 'Settlement'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                    </View>
                    <Text style={styles.giftPersonName}>
                      Gift for {person?.name || 'Unknown'}
                    </Text>
                    {gift.purchasedItem && (
                      <Text style={styles.giftItem}>{gift.purchasedItem}</Text>
                    )}
                    {gift.phase === 'settlement' && totalCount > 0 && (
                      <View style={styles.progressWrap}>
                        <View style={styles.progressBar}>
                          <View style={[styles.progressFill, { width: `${(paidCount / totalCount) * 100}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{paidCount}/{totalCount}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members</Text>
          <View style={styles.memberList}>
            {group.members.map((member) => (
              <View key={member.id} style={styles.memberRow}>
                <View style={[styles.miniAvatar, { backgroundColor: member.avatarColor }]}>
                  <Text style={styles.miniAvatarText}>{getInitials(member.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>
                    {member.name}{member.id === user.id ? ' (You)' : ''}
                  </Text>
                  {member.birthday ? (
                    <Text style={styles.memberDate}>{formatDate(member.birthday)}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal visible={showNewGift} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowNewGift(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Start a Gift</Text>
            <Text style={styles.modalSub}>Who is the birthday person?</Text>
            <ScrollView style={styles.personList} showsVerticalScrollIndicator={false}>
              {group.members
                .filter((m) => m.id !== user.id)
                .map((member) => (
                  <Pressable
                    key={member.id}
                    style={[
                      styles.personItem,
                      selectedPerson === member.id && styles.personSelected,
                    ]}
                    onPress={() => setSelectedPerson(member.id)}
                  >
                    <View style={[styles.personAvatar, { backgroundColor: member.avatarColor }]}>
                      <Text style={styles.personAvatarText}>{getInitials(member.name)}</Text>
                    </View>
                    <Text style={styles.personName}>{member.name}</Text>
                    {selectedPerson === member.id && (
                      <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                    )}
                  </Pressable>
                ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalCancel, pressed && { opacity: 0.7 }]}
                onPress={() => setShowNewGift(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalSubmit,
                  pressed && { opacity: 0.85 },
                  !selectedPerson && { opacity: 0.5 },
                ]}
                onPress={handleCreateGift}
                disabled={!selectedPerson || creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.modalSubmitText}>Create</Text>
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
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 20,
  },
  groupIconBig: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  groupName: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
  },
  memberCount: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    width: '100%',
  },
  inviteCodeBox: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
  },
  inviteLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inviteCode: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
    letterSpacing: 2,
    marginTop: 2,
  },
  shareBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
  birthdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  miniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  miniAvatarText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
  daysChip: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  daysUrgent: { backgroundColor: Colors.warningLight },
  daysToday: { backgroundColor: Colors.dangerLight },
  daysText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 32,
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
  giftList: { gap: 8 },
  giftCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cardPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  giftTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  phaseChip: {
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  phaseSettlement: {
    backgroundColor: Colors.primarySoft,
  },
  phaseText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.warning,
  },
  giftPersonName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  giftItem: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
  },
  memberList: { gap: 4 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  memberName: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: Colors.text,
  },
  memberDate: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 1,
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
    maxHeight: 480,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  personList: {
    maxHeight: 280,
    marginBottom: 16,
  },
  personItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  personSelected: {
    backgroundColor: Colors.primarySoft,
  },
  personAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  personAvatarText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
  personName: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: Colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
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
