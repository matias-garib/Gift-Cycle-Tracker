import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/AppContext';
import { getInitials } from '@/lib/helpers';

interface MemberStat {
  userId: string;
  name: string;
  avatarColor: string;
  totalPaid: number;
  totalOwed: number;
  avgPayTimeHours: number;
  onTimeCount: number;
  lateCount: number;
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { user, groups, gifts } = useApp();

  const stats = useMemo(() => {
    const memberMap = new Map<string, MemberStat>();

    const allMembers = groups.flatMap((g) => g.members);
    allMembers.forEach((m) => {
      if (!memberMap.has(m.id)) {
        memberMap.set(m.id, {
          userId: m.id,
          name: m.name,
          avatarColor: m.avatarColor,
          totalPaid: 0,
          totalOwed: 0,
          avgPayTimeHours: 0,
          onTimeCount: 0,
          lateCount: 0,
        });
      }
    });

    gifts.forEach((gift) => {
      if (gift.phase !== 'settlement' || !gift.purchasedAt) return;
      const purchaseTime = new Date(gift.purchasedAt).getTime();

      gift.payments.forEach((payment) => {
        const stat = memberMap.get(payment.userId);
        if (!stat) return;
        stat.totalOwed += payment.amount;
        if (payment.paid) {
          stat.totalPaid += payment.amount;
          if (payment.paidAt) {
            const payTime = new Date(payment.paidAt).getTime();
            const hoursToPayment = (payTime - purchaseTime) / (1000 * 60 * 60);
            stat.avgPayTimeHours =
              (stat.avgPayTimeHours * stat.onTimeCount + hoursToPayment) /
              (stat.onTimeCount + 1);
            if (hoursToPayment <= 48) {
              stat.onTimeCount++;
            } else {
              stat.lateCount++;
            }
          }
        } else {
          stat.lateCount++;
        }
      });
    });

    return Array.from(memberMap.values()).filter(
      (s) => s.totalOwed > 0 || s.totalPaid > 0
    );
  }, [groups, gifts]);

  const fastestPayers = useMemo(
    () =>
      [...stats]
        .filter((s) => s.onTimeCount > 0)
        .sort((a, b) => a.avgPayTimeHours - b.avgPayTimeHours)
        .slice(0, 5),
    [stats]
  );

  const serialLaggers = useMemo(
    () =>
      [...stats]
        .filter((s) => s.lateCount > 0)
        .sort((a, b) => b.lateCount - a.lateCount)
        .slice(0, 5),
    [stats]
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
        <Text style={styles.title}>Wall of Fame & Shame</Text>
        <Text style={styles.subtitle}>See who pays up and who keeps everyone waiting</Text>

        {stats.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="trophy-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No stats yet</Text>
            <Text style={styles.emptyText}>
              Stats will appear once gifts are purchased and payments begin
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="trophy" size={20} color={Colors.warning} />
                <Text style={styles.sectionTitle}>Hall of Fame</Text>
              </View>
              <Text style={styles.sectionSub}>Fastest payers in the group</Text>

              {fastestPayers.length === 0 ? (
                <Text style={styles.noData}>No fast payers yet</Text>
              ) : (
                <View style={styles.list}>
                  {fastestPayers.map((stat, i) => (
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
                      <View style={[styles.statAvatar, { backgroundColor: stat.avatarColor }]}>
                        <Text style={styles.statAvatarText}>{getInitials(stat.name)}</Text>
                      </View>
                      <View style={styles.statInfo}>
                        <Text style={styles.statName}>
                          {stat.name}
                          {stat.userId === user?.id ? ' (You)' : ''}
                        </Text>
                        <Text style={styles.statDetail}>
                          Avg: {stat.avgPayTimeHours < 1 ? 'under 1h' : `${Math.round(stat.avgPayTimeHours)}h`}
                        </Text>
                      </View>
                      <View style={styles.statBadge}>
                        <Ionicons name="flash" size={14} color={Colors.warning} />
                        <Text style={styles.statBadgeText}>{stat.onTimeCount}x</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time" size={20} color={Colors.danger} />
                <Text style={styles.sectionTitle}>Wall of Shame</Text>
              </View>
              <Text style={styles.sectionSub}>Serial laggers who keep everyone waiting</Text>

              {serialLaggers.length === 0 ? (
                <Text style={styles.noData}>No laggers yet - everyone pays on time!</Text>
              ) : (
                <View style={styles.list}>
                  {serialLaggers.map((stat, i) => (
                    <View key={stat.userId} style={[styles.statCard, styles.shameCard]}>
                      <View style={styles.rankWrap}>
                        <Text style={styles.rankShame}>{i + 1}</Text>
                      </View>
                      <View style={[styles.statAvatar, { backgroundColor: stat.avatarColor }]}>
                        <Text style={styles.statAvatarText}>{getInitials(stat.name)}</Text>
                      </View>
                      <View style={styles.statInfo}>
                        <Text style={styles.statName}>
                          {stat.name}
                          {stat.userId === user?.id ? ' (You)' : ''}
                        </Text>
                        <Text style={styles.statDetail}>
                          ${stat.totalOwed.toFixed(2)} total owed
                        </Text>
                      </View>
                      <View style={[styles.statBadge, styles.shameBadge]}>
                        <Ionicons name="alert-circle" size={14} color={Colors.danger} />
                        <Text style={[styles.statBadgeText, styles.shameBadgeText]}>{stat.lateCount}x late</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="bar-chart" size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Overview</Text>
              </View>

              <View style={styles.overviewGrid}>
                <View style={styles.overviewCard}>
                  <Text style={styles.overviewNum}>{gifts.length}</Text>
                  <Text style={styles.overviewLabel}>Total Gifts</Text>
                </View>
                <View style={styles.overviewCard}>
                  <Text style={styles.overviewNum}>
                    ${gifts.reduce((sum, g) => sum + (g.totalCost || 0), 0).toFixed(0)}
                  </Text>
                  <Text style={styles.overviewLabel}>Total Spent</Text>
                </View>
                <View style={styles.overviewCard}>
                  <Text style={styles.overviewNum}>{stats.length}</Text>
                  <Text style={styles.overviewLabel}>Members</Text>
                </View>
                <View style={styles.overviewCard}>
                  <Text style={styles.overviewNum}>
                    {gifts.filter((g) => g.phase === 'settlement' && g.payments.every((p) => p.paid)).length}
                  </Text>
                  <Text style={styles.overviewLabel}>Settled</Text>
                </View>
              </View>
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
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  overviewCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  overviewNum: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
  overviewLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 4,
  },
});
