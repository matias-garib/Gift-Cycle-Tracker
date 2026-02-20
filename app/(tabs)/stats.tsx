import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Platform, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/AppContext';
import { getInitials } from '@/lib/helpers';

interface SpeedStat {
  userId: string;
  name: string;
  avatarColor: string;
  profileImage?: string;
  avgSpeedHours: number;
  payCount: number;
}

function formatSpeed(hours: number): string {
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return mins <= 1 ? 'under 1 min' : `${mins} min`;
  }
  if (hours < 24) {
    return `${Math.round(hours)}h`;
  }
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { user, groups, gifts } = useApp();

  const myGroupMemberIds = useMemo(() => {
    const ids = new Set<string>();
    groups.forEach((g) => g.members.forEach((m) => ids.add(m.id)));
    return ids;
  }, [groups]);

  const speedStats = useMemo(() => {
    const memberMap = new Map<string, SpeedStat>();

    groups.forEach((g) => {
      g.members.forEach((m) => {
        if (!memberMap.has(m.id)) {
          memberMap.set(m.id, {
            userId: m.id,
            name: m.name,
            avatarColor: m.avatarColor,
            profileImage: m.profileImage,
            avgSpeedHours: 0,
            payCount: 0,
          });
        }
      });
    });

    gifts.forEach((gift) => {
      if (gift.phase !== 'settlement' || !gift.purchasedAt) return;
      const purchaseTime = new Date(gift.purchasedAt).getTime();

      gift.payments.forEach((payment) => {
        if (!myGroupMemberIds.has(payment.userId)) return;
        const stat = memberMap.get(payment.userId);
        if (!stat) return;

        if (payment.paid && payment.paidAt) {
          const payTime = new Date(payment.paidAt).getTime();
          const hoursToPayment = (payTime - purchaseTime) / (1000 * 60 * 60);
          if (hoursToPayment >= 0) {
            stat.avgSpeedHours =
              (stat.avgSpeedHours * stat.payCount + hoursToPayment) /
              (stat.payCount + 1);
            stat.payCount++;
          }
        }
      });
    });

    return Array.from(memberMap.values()).filter((s) => s.payCount > 0);
  }, [groups, gifts, myGroupMemberIds]);

  const hallOfFame = useMemo(
    () =>
      [...speedStats]
        .sort((a, b) => a.avgSpeedHours - b.avgSpeedHours)
        .slice(0, 5),
    [speedStats]
  );

  const hallOfShame = useMemo(
    () =>
      [...speedStats]
        .sort((a, b) => b.avgSpeedHours - a.avgSpeedHours)
        .slice(0, 5),
    [speedStats]
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
        <Text style={styles.title}>Speed Rankings</Text>
        <Text style={styles.subtitle}>
          Average time from purchase to clicking "I have paid"
        </Text>

        {speedStats.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="speedometer-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No speed data yet</Text>
            <Text style={styles.emptyText}>
              Rankings will appear once gifts are purchased and people start paying
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="trophy" size={20} color={Colors.warning} />
                <Text style={styles.sectionTitle}>Hall of Fame</Text>
              </View>
              <Text style={styles.sectionSub}>Fastest average payment speed</Text>

              {hallOfFame.length === 0 ? (
                <Text style={styles.noData}>No data yet</Text>
              ) : (
                <View style={styles.list}>
                  {hallOfFame.map((stat, i) => (
                    <View key={stat.userId} style={styles.statCard}>
                      <View style={styles.rankWrap}>
                        <Text style={[
                          styles.rank,
                          i === 0 && styles.rankGold,
                          i === 1 && styles.rankSilver,
                          i === 2 && styles.rankBronze,
                        ]}>
                          {i + 1}
                        </Text>
                      </View>
                      {stat.profileImage ? (
                        <Image source={{ uri: stat.profileImage }} style={styles.statAvatarImg} />
                      ) : (
                        <View style={[styles.statAvatar, { backgroundColor: stat.avatarColor }]}>
                          <Text style={styles.statAvatarText}>{getInitials(stat.name)}</Text>
                        </View>
                      )}
                      <View style={styles.statInfo}>
                        <Text style={styles.statName}>
                          {stat.name}
                          {stat.userId === user?.id ? ' (You)' : ''}
                        </Text>
                        <Text style={styles.statDetail}>
                          Avg speed: {formatSpeed(stat.avgSpeedHours)}
                        </Text>
                      </View>
                      <View style={styles.statBadge}>
                        <Ionicons name="flash" size={14} color={Colors.warning} />
                        <Text style={styles.statBadgeText}>{stat.payCount}x</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="hourglass" size={20} color={Colors.danger} />
                <Text style={styles.sectionTitle}>Hall of Shame</Text>
              </View>
              <Text style={styles.sectionSub}>Slowest average payment speed</Text>

              {hallOfShame.length === 0 ? (
                <Text style={styles.noData}>No slow payers yet</Text>
              ) : (
                <View style={styles.list}>
                  {hallOfShame.map((stat, i) => (
                    <View key={stat.userId} style={[styles.statCard, styles.shameCard]}>
                      <View style={styles.rankWrap}>
                        <Text style={styles.rankShame}>{i + 1}</Text>
                      </View>
                      {stat.profileImage ? (
                        <Image source={{ uri: stat.profileImage }} style={styles.statAvatarImg} />
                      ) : (
                        <View style={[styles.statAvatar, { backgroundColor: stat.avatarColor }]}>
                          <Text style={styles.statAvatarText}>{getInitials(stat.name)}</Text>
                        </View>
                      )}
                      <View style={styles.statInfo}>
                        <Text style={styles.statName}>
                          {stat.name}
                          {stat.userId === user?.id ? ' (You)' : ''}
                        </Text>
                        <Text style={styles.statDetail}>
                          Avg speed: {formatSpeed(stat.avgSpeedHours)}
                        </Text>
                      </View>
                      <View style={[styles.statBadge, styles.shameBadge]}>
                        <Ionicons name="time" size={14} color={Colors.danger} />
                        <Text style={[styles.statBadgeText, styles.shameBadgeText]}>{stat.payCount}x</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20 },
  title: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textTertiary,
    textAlign: 'center',
    maxWidth: 240,
  },
  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  sectionSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginBottom: 12,
    marginLeft: 28,
  },
  noData: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textTertiary,
    fontStyle: 'italic',
    marginLeft: 28,
  },
  list: { gap: 8 },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  shameCard: {
    borderColor: '#F0D6D6',
  },
  rankWrap: {
    width: 28,
    alignItems: 'center',
  },
  rank: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: Colors.textTertiary,
  },
  rankGold: { color: '#D4A537' },
  rankSilver: { color: '#8A8A8A' },
  rankBronze: { color: '#CD853F' },
  rankShame: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: Colors.danger,
  },
  statAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  statAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginLeft: 8,
  },
  statAvatarText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
  statInfo: { flex: 1, marginLeft: 10 },
  statName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  statDetail: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 1,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.warning,
  },
  shameBadge: {
    backgroundColor: Colors.dangerLight,
  },
  shameBadgeText: {
    color: Colors.danger,
  },
});
