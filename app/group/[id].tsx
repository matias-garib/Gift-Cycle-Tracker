import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  Share, Modal, ActivityIndicator, Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/AppContext';
import { getInitials, getUpcomingBirthdays, formatDate, getDaysUntilBirthday, getAgeTurning } from '@/lib/helpers';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user, getGroupById, getGiftsForGroup, createGift, updateGroupImage, removeMemberFromGroup } = useApp();
  const [inviteExpanded, setInviteExpanded] = useState(false);
  const [startingGift, setStartingGift] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  const group = getGroupById(id!);
  const groupGifts = getGiftsForGroup(id!);

  const upcomingBirthdays = useMemo(() => {
    if (!group) return [];
    return getUpcomingBirthdays(
      group.members.filter((m) => m.birthday),
      30
    );
  }, [group]);

  const activeGifts = useMemo(() => {
    if (!group) return [];
    const unsettled = groupGifts.filter((g) => {
      if (g.phase === 'ideation' || g.phase === 'payment') return true;
      if (g.phase === 'settlement' && g.payments.some((p) => !p.paid)) return true;
      return false;
    });
    const seen = new Set<string>();
    const deduped = unsettled.filter((g) => {
      if (seen.has(g.birthdayPersonId)) return false;
      seen.add(g.birthdayPersonId);
      return true;
    });
    return deduped.sort((a, b) => {
      const personA = group.members.find((m) => m.id === a.birthdayPersonId);
      const personB = group.members.find((m) => m.id === b.birthdayPersonId);
      const daysA = personA?.birthday ? getDaysUntilBirthday(personA.birthday) : 999;
      const daysB = personB?.birthday ? getDaysUntilBirthday(personB.birthday) : 999;
      return daysA - daysB;
    });
  }, [groupGifts, group]);

  const activeMembers = useMemo(() => {
    if (!group || !user) return [];
    const activeGiftPersonIds = new Set(activeGifts.map((g) => g.birthdayPersonId));
    return group.members
      .filter((m) => m.id !== user.id && m.birthday)
      .map((m) => ({ ...m, daysUntil: getDaysUntilBirthday(m.birthday) }))
      .filter((m) => m.daysUntil <= 20 && m.daysUntil >= 0 && !activeGiftPersonIds.has(m.id))
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [group, user, activeGifts]);

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

  const isOrganizer = group.organizerId === user.id;

  const handleShare = async () => {
    const domain = process.env.EXPO_PUBLIC_DOMAIN || 'gift-cycle-tracker.vercel.app';
    const inviteUrl = `https://${domain}/join/${group.inviteCode}`;
    try {
      await Share.share({
        message: `Join my GiftCycle group "${group.name}"!\n\nTap the link to join:\n${inviteUrl}\n\nOr use code: ${group.inviteCode}`,
      });
    } catch {}
  };

  const handlePickGroupImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      await updateGroupImage(group.id, result.assets[0].uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setRemovingMember(memberId);
  };

  const confirmRemoveMember = async () => {
    if (!removingMember) return;
    await removeMemberFromGroup(group.id, removingMember);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRemovingMember(null);
  };

  const handleStartGift = async (memberId: string) => {
    setStartingGift(memberId);
    try {
      const gift = await createGift(group.id, memberId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/gift/${gift.id}`);
    } catch {
    } finally {
      setStartingGift(null);
    }
  };

  const webTop = Platform.OS === 'web' ? 67 : 0;
  const removingMemberUser = removingMember ? group.members.find(m => m.id === removingMember) : null;

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
          <Pressable onPress={handlePickGroupImage} style={styles.groupImageWrap}>
            {group.groupImage ? (
              <Image source={{ uri: group.groupImage }} style={styles.groupImageBig} />
            ) : (
              <View style={styles.groupIconBig}>
                <Ionicons name="people" size={28} color={Colors.primary} />
              </View>
            )}
            <View style={styles.cameraOverlay}>
              <Ionicons name="camera" size={14} color={Colors.white} />
            </View>
          </Pressable>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.memberCount}>
            {group.members.length} member{group.members.length !== 1 ? 's' : ''}
          </Text>

          <Pressable
            style={styles.inviteToggle}
            onPress={() => {
              setInviteExpanded(!inviteExpanded);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Ionicons name="link-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.inviteToggleText}>
              {inviteExpanded ? 'Hide invite options' : 'Invite people'}
            </Text>
            <Ionicons
              name={inviteExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.textSecondary}
            />
          </Pressable>

          {inviteExpanded && (
            <View style={styles.inviteContent}>
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
              <Text style={styles.inviteHint}>
                Share the invite link - people who open it will be added automatically
              </Text>
            </View>
          )}
        </View>

        {upcomingBirthdays.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Birthdays</Text>
            {upcomingBirthdays.map((member) => (
              <View key={member.id} style={styles.birthdayRow}>
                {member.profileImage ? (
                  <Image source={{ uri: member.profileImage }} style={styles.miniAvatarImg} />
                ) : (
                  <View style={[styles.miniAvatar, { backgroundColor: member.avatarColor }]}>
                    <Text style={styles.miniAvatarText}>{getInitials(member.name)}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberDate}>{formatDate(member.birthday)} · Turning {getAgeTurning(member.birthday)}</Text>
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
          <Text style={styles.sectionTitle}>Active Gifts</Text>

          {activeMembers.length === 0 && activeGifts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="gift-outline" size={32} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No active gifts right now. They'll appear when a birthday is within 20 days.</Text>
            </View>
          ) : (
            <View style={styles.giftList}>
              {activeMembers.map((member) => (
                <View key={`suggest-${member.id}`} style={styles.suggestCard}>
                  <View style={styles.suggestTop}>
                    {member.profileImage ? (
                      <Image source={{ uri: member.profileImage }} style={styles.miniAvatarImg} />
                    ) : (
                      <View style={[styles.miniAvatar, { backgroundColor: member.avatarColor }]}>
                        <Text style={styles.miniAvatarText}>{getInitials(member.name)}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.giftPersonName}>Start a gift for {member.name}</Text>
                      <Text style={styles.giftItem}>
                        {formatDate(member.birthday)} · {member.daysUntil === 0 ? 'Today!' : `${member.daysUntil}d away`}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.startGiftBtn, pressed && { opacity: 0.85 }, startingGift === member.id && { opacity: 0.5 }]}
                    onPress={() => handleStartGift(member.id)}
                    disabled={startingGift === member.id}
                  >
                    {startingGift === member.id ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <>
                        <Ionicons name="gift" size={16} color={Colors.white} />
                        <Text style={styles.startGiftText}>Start Gift</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              ))}

              {activeGifts.map((gift) => {
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Members</Text>
            {isOrganizer && (
              <View style={styles.organizerBadge}>
                <Ionicons name="shield-checkmark" size={12} color={Colors.primary} />
                <Text style={styles.organizerText}>Organizer</Text>
              </View>
            )}
          </View>
          <View style={styles.memberList}>
            {group.members.map((member) => (
              <View key={member.id} style={styles.memberRow}>
                {member.profileImage ? (
                  <Image source={{ uri: member.profileImage }} style={styles.miniAvatarImg} />
                ) : (
                  <View style={[styles.miniAvatar, { backgroundColor: member.avatarColor }]}>
                    <Text style={styles.miniAvatarText}>{getInitials(member.name)}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={styles.memberNameRow}>
                    <Text style={styles.memberName}>
                      {member.name}{member.id === user.id ? ' (You)' : ''}
                    </Text>
                    {member.id === group.organizerId && (
                      <View style={styles.organizerSmallBadge}>
                        <Ionicons name="shield-checkmark" size={10} color={Colors.primary} />
                      </View>
                    )}
                  </View>
                  {member.birthday ? (
                    <Text style={styles.memberDate}>{formatDate(member.birthday)}</Text>
                  ) : null}
                </View>
                {isOrganizer && member.id !== user.id && (
                  <Pressable
                    onPress={() => handleRemoveMember(member.id)}
                    style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.6 }]}
                  >
                    <Ionicons name="close-circle" size={20} color={Colors.danger} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal visible={!!removingMember} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setRemovingMember(null)}>
          <Pressable style={styles.confirmModal} onPress={(e) => e.stopPropagation()}>
            <Ionicons name="alert-circle" size={36} color={Colors.danger} />
            <Text style={styles.confirmTitle}>Remove Member</Text>
            <Text style={styles.confirmText}>
              Remove {removingMemberUser?.name} from this group? This can't be undone.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalCancel, pressed && { opacity: 0.7 }]}
                onPress={() => setRemovingMember(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalSubmitDanger, pressed && { opacity: 0.85 }]}
                onPress={confirmRemoveMember}
              >
                <Text style={styles.modalSubmitText}>Remove</Text>
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
  groupImageWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  groupImageBig: {
    width: 64,
    height: 64,
    borderRadius: 18,
  },
  groupIconBig: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.card,
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
  inviteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.backgroundSecondary,
  },
  inviteToggleText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
  },
  inviteContent: {
    width: '100%',
    marginTop: 12,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  inviteCodeBox: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 10,
  },
  inviteLabel: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inviteCode: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
    letterSpacing: 2,
    marginTop: 1,
  },
  inviteHint: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.textTertiary,
    marginTop: 8,
    textAlign: 'center',
  },
  shareBtn: {
    width: 40,
    height: 40,
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
  organizerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
  },
  organizerText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  organizerSmallBadge: {
    marginLeft: 4,
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
  miniAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  suggestCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderStyle: 'dashed' as const,
  },
  suggestTop: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  startGiftBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  startGiftText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
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
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  removeBtn: {
    padding: 4,
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
  confirmModal: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
    marginTop: 10,
    marginBottom: 6,
  },
  confirmText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
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
  personAvatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  modalSubmitDanger: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: Colors.danger,
  },
  modalSubmitText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
});
