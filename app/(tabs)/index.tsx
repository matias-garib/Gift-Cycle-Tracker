import React, { useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform, ActivityIndicator, Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/AppContext';
import { getUpcomingBirthdays, getInitials, formatDate, getDaysUntilBirthday, getAgeTurning } from '@/lib/helpers';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, groups, gifts, loading, getGiftsForGroup } = useApp();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [loading, user]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!user) return null;

  const allMembers = groups.flatMap((g) =>
    g.members.filter((m) => m.id !== user.id && m.birthday).map((m) => ({
      ...m,
      groupId: g.id,
      groupName: g.name,
    }))
  );

  const uniqueMembers = allMembers.filter(
    (m, i, arr) => arr.findIndex((a) => a.id === m.id) === i
  );

  const upcoming = getUpcomingBirthdays(uniqueMembers, 30);

  const activeGiftsRaw = gifts.filter((g) => g.phase !== 'settlement' || g.payments.some((p) => !p.paid));
  const seenPersonIds = new Set<string>();
  const activeGifts = activeGiftsRaw
    .sort((a, b) => {
      const personA = allMembers.find((m) => m.id === a.birthdayPersonId);
      const personB = allMembers.find((m) => m.id === b.birthdayPersonId);
      const daysA = personA?.birthday ? getDaysUntilBirthday(personA.birthday) : 999;
      const daysB = personB?.birthday ? getDaysUntilBirthday(personB.birthday) : 999;
      return daysA - daysB;
    })
    .filter((g) => {
      if (seenPersonIds.has(g.birthdayPersonId)) return false;
      seenPersonIds.add(g.birthdayPersonId);
      return true;
    });
  const myDebts = gifts.filter(
    (g) => g.phase === 'settlement' && g.payments.some((p) => p.userId === user.id && !p.paid)
  );

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
          <View>
            <Text style={styles.greeting}>Hello, {user.name.split(' ')[0]}</Text>
            <Text style={styles.subGreeting}>
              {upcoming.length > 0
                ? `${upcoming.length} birthday${upcoming.length > 1 ? 's' : ''} coming up`
                : 'No upcoming birthdays'}
            </Text>
          </View>
          {user.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: user.avatarColor || Colors.primary }]}>
              <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
            </View>
          )}
        </View>

        {myDebts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.alertCard}>
              <Ionicons name="alert-circle" size={20} color={Colors.danger} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.alertTitle}>
                  You owe on {myDebts.length} gift{myDebts.length > 1 ? 's' : ''}
                </Text>
                <Text style={styles.alertSub}>Tap to settle up</Text>
              </View>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (myDebts[0]) router.push(`/gift/${myDebts[0].id}`);
                }}
              >
                <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Birthdays</Text>
          {upcoming.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={32} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>
                {groups.length === 0
                  ? 'Join or create a group to see birthdays'
                  : 'No birthdays in the next 30 days'}
              </Text>
            </View>
          ) : (
            <View style={styles.birthdayList}>
              {upcoming.map((member) => {
                const memberGroup = allMembers.find((m) => m.id === member.id);
                return (
                  <Pressable
                    key={member.id}
                    style={({ pressed }) => [styles.birthdayCard, pressed && styles.cardPressed]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (memberGroup) router.push(`/group/${memberGroup.groupId}`);
                    }}
                  >
                    {member.profileImage ? (
                      <Image source={{ uri: member.profileImage }} style={styles.bdayAvatarImg} />
                    ) : (
                      <View style={[styles.bdayAvatar, { backgroundColor: member.avatarColor }]}>
                        <Text style={styles.bdayAvatarText}>{getInitials(member.name)}</Text>
                      </View>
                    )}
                    <View style={styles.bdayInfo}>
                      <Text style={styles.bdayName}>{member.name}</Text>
                      <Text style={styles.bdayDate}>
                        {formatDate(member.birthday)} · Turning {getAgeTurning(member.birthday)}
                      </Text>
                    </View>
                    <View style={[
                      styles.daysChip,
                      member.daysUntil <= 3 && styles.daysChipUrgent,
                      member.daysUntil === 0 && styles.daysChipToday,
                    ]}>
                      <Text style={[
                        styles.daysText,
                        member.daysUntil <= 3 && styles.daysTextUrgent,
                        member.daysUntil === 0 && styles.daysTextToday,
                      ]}>
                        {member.daysUntil === 0 ? 'Today!' : `${member.daysUntil}d`}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {activeGifts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Gifts</Text>
            {activeGifts.slice(0, 5).map((gift) => {
              const group = groups.find((g) => g.id === gift.groupId);
              const person = group?.members.find((m) => m.id === gift.birthdayPersonId);
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
                  <View style={styles.giftPhaseChip}>
                    <Ionicons
                      name={gift.phase === 'ideation' ? 'bulb-outline' : gift.phase === 'payment' ? 'cart-outline' : 'checkmark-circle-outline'}
                      size={14}
                      color={gift.phase === 'settlement' ? Colors.primary : Colors.accent}
                    />
                    <Text style={styles.giftPhaseText}>
                      {gift.phase === 'ideation' ? 'Wishlist' : gift.phase === 'payment' ? 'Purchasing' : 'Settlement'}
                    </Text>
                  </View>
                  <Text style={styles.giftTitle}>
                    Gift for {person?.name || 'Unknown'}
                  </Text>
                  {gift.phase === 'settlement' && totalCount > 0 && (
                    <View style={styles.progressWrap}>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${(paidCount / totalCount) * 100}%` }]} />
                      </View>
                      <Text style={styles.progressText}>{paidCount}/{totalCount} paid</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {groups.length === 0 && (
          <View style={styles.section}>
            <View style={styles.ctaCard}>
              <Ionicons name="people" size={28} color={Colors.primary} />
              <Text style={styles.ctaTitle}>Create Your First Group</Text>
              <Text style={styles.ctaText}>
                Start by creating a group and inviting your friends
              </Text>
              <Pressable
                style={({ pressed }) => [styles.ctaButton, pressed && { opacity: 0.85 }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/(tabs)/groups');
                }}
              >
                <Ionicons name="add" size={18} color={Colors.white} />
                <Text style={styles.ctaButtonText}>Create Group</Text>
              </Pressable>
            </View>
          </View>
        )}
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
    marginBottom: 24,
  },
  greeting: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
  },
  subGreeting: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
    marginBottom: 12,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8C4C4',
  },
  alertTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.danger,
  },
  alertSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.danger,
    marginTop: 2,
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
  birthdayList: { gap: 8 },
  birthdayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cardPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  bdayAvatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
  },
  bdayAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bdayAvatarText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
  bdayInfo: { flex: 1, marginLeft: 12 },
  bdayName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  bdayDate: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  daysChip: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  daysChipUrgent: {
    backgroundColor: Colors.warningLight,
  },
  daysChipToday: {
    backgroundColor: Colors.dangerLight,
  },
  daysText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  daysTextUrgent: {
    color: Colors.warning,
  },
  daysTextToday: {
    color: Colors.danger,
  },
  giftCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  giftPhaseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  giftPhaseText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: Colors.accent,
  },
  giftTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
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
  ctaCard: {
    backgroundColor: Colors.primarySoft,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.accentLight,
  },
  ctaTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  ctaButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
});
