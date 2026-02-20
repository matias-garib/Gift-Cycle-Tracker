import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  TextInput, Modal, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/AppContext';
import { getInitials } from '@/lib/helpers';

export default function GroupsScreen() {
  const insets = useSafeAreaInsets();
  const { user, groups, createGroup, joinGroup, seedDemoData } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    setCreating(true);
    try {
      const group = await createGroup(groupName.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCreate(false);
      setGroupName('');
      router.push(`/group/${group.id}`);
    } catch {
      Alert.alert('Error', 'Could not create group');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    const group = await joinGroup(inviteCode.trim());
    if (group) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowJoin(false);
      setInviteCode('');
      router.push(`/group/${group.id}`);
    } else {
      Alert.alert('Not Found', 'No group found with that invite code');
    }
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
          <Text style={styles.title}>Groups</Text>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowJoin(true);
              }}
              style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="enter-outline" size={22} color={Colors.primary} />
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowCreate(true);
              }}
              style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="add" size={24} color={Colors.primary} />
            </Pressable>
          </View>
        </View>

        {groups.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptyText}>Create a group or join one with an invite code</Text>
            <View style={styles.emptyActions}>
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
                onPress={() => setShowCreate(true)}
              >
                <Text style={styles.primaryBtnText}>Create Group</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  await seedDemoData();
                }}
              >
                <Text style={styles.secondaryBtnText}>Load Demo Data</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.groupList}>
            {groups.map((group) => (
              <Pressable
                key={group.id}
                style={({ pressed }) => [styles.groupCard, pressed && styles.cardPressed]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/group/${group.id}`);
                }}
              >
                <View style={styles.groupIcon}>
                  <Ionicons name="people" size={22} color={Colors.primary} />
                </View>
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupMembers}>
                    {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.memberAvatars}>
                  {group.members.slice(0, 3).map((m, i) => (
                    <View
                      key={m.id}
                      style={[
                        styles.miniAvatar,
                        { backgroundColor: m.avatarColor, marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i },
                      ]}
                    >
                      <Text style={styles.miniAvatarText}>{getInitials(m.name)}</Text>
                    </View>
                  ))}
                  {group.members.length > 3 && (
                    <View style={[styles.miniAvatar, { backgroundColor: Colors.backgroundSecondary, marginLeft: -8 }]}>
                      <Text style={[styles.miniAvatarText, { color: Colors.textSecondary }]}>
                        +{group.members.length - 3}
                      </Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={showCreate} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowCreate(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Create Group</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Group name (e.g., College Friends)"
              placeholderTextColor={Colors.textTertiary}
              value={groupName}
              onChangeText={setGroupName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalCancel, pressed && { opacity: 0.7 }]}
                onPress={() => setShowCreate(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalSubmit, pressed && { opacity: 0.85 }, !groupName.trim() && { opacity: 0.5 }]}
                onPress={handleCreate}
                disabled={!groupName.trim() || creating}
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

      <Modal visible={showJoin} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowJoin(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Join Group</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter invite code"
              placeholderTextColor={Colors.textTertiary}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalCancel, pressed && { opacity: 0.7 }]}
                onPress={() => setShowJoin(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalSubmit, pressed && { opacity: 0.85 }, !inviteCode.trim() && { opacity: 0.5 }]}
                onPress={handleJoin}
                disabled={!inviteCode.trim()}
              >
                <Text style={styles.modalSubmitText}>Join</Text>
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
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  emptyActions: {
    gap: 10,
    marginTop: 20,
    width: '100%',
    maxWidth: 260,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
  secondaryBtn: {
    backgroundColor: Colors.card,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  groupList: { gap: 10 },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cardPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInfo: { flex: 1, marginLeft: 12 },
  groupName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  groupMembers: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  memberAvatars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.card,
  },
  miniAvatarText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
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
    marginBottom: 20,
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
