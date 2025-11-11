import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getSavedUser, User } from '@/lib/auth';
import { getRewards, getRewardClaims, claimReward, getVolunteerStats, RewardDefinition, ClaimedReward } from '@/lib/api';

interface BadgeDefinition {
  id: string;
  title: string;
  icon: 'star.fill' | 'checkmark.circle.fill' | 'flame.fill' | 'tag.fill' | 'person.fill';
  threshold: number; // tasks completed required
}

const BADGES: BadgeDefinition[] = [
  { id: 'starter', title: 'Starter', icon: 'checkmark.circle.fill', threshold: 1 },
  { id: 'helper', title: 'Helper', icon: 'person.fill', threshold: 5 },
  { id: 'impact', title: 'Impact Maker', icon: 'star.fill', threshold: 10 },
  { id: 'guardian', title: 'Eco Guardian', icon: 'flame.fill', threshold: 20 },
  { id: 'champion', title: 'Community Champion', icon: 'tag.fill', threshold: 35 },
];

export default function VolunteerRewardsScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [inProgress, setInProgress] = useState(0);
  const [ecoPoints, setEcoPoints] = useState(0);
  const [spentPoints, setSpentPoints] = useState(0);
  const [claimedRewards, setClaimedRewards] = useState<ClaimedReward[]>([]);
  const [rewards, setRewards] = useState<RewardDefinition[]>([]);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<RewardDefinition | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load user and stats
  useEffect(() => {
    loadUser();
  }, []);

  const asIdString = (val: any): string | null => {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && typeof val.$oid === 'string') return val.$oid;
    try { return String(val); } catch { return null; }
  };

  const loadUser = async () => {
    const saved = await getSavedUser();
    if (saved) {
      setUser(saved);
      await Promise.all([loadStats(saved), loadRewards(saved), loadClaims(saved)]);
      // periodic refresh for near real-time updates
      startPolling(saved);
    }
  };

  const loadStats = async (savedUser: User) => {
    try {
      const uid = (savedUser._id || savedUser.id || '').toString();
      const s = await getVolunteerStats(uid);
      setTasksCompleted(s.tasksCompleted);
      setInProgress(s.inProgress);
      setEcoPoints(s.ecoPoints);
    } catch (e) {
      console.warn('Failed loading stats', e);
    }
  };

  const loadRewards = async (_savedUser: User) => {
    try {
      const catalog = await getRewards();
      setRewards(catalog);
    } catch (e) {
      console.warn('Failed loading rewards');
    }
  };

  const loadClaims = async (savedUser: User) => {
    try {
      const uid = (savedUser._id || savedUser.id || '').toString();
      const claims = await getRewardClaims(uid, 100);
      setClaimedRewards(claims);
      const totalSpent = claims.reduce((sum, c) => sum + (c.cost || 0), 0);
      setSpentPoints(totalSpent);
    } catch (e) {
      console.warn('Failed loading claims');
    }
  };

  const startPolling = (savedUser: User) => {
    const uid = (savedUser._id || savedUser.id || '').toString();
    const interval = setInterval(async () => {
      try {
        const [s, claims] = await Promise.all([
          getVolunteerStats(uid),
          getRewardClaims(uid, 100),
        ]);
        setTasksCompleted(s.tasksCompleted);
        setInProgress(s.inProgress);
        setEcoPoints(s.ecoPoints);
        setClaimedRewards(claims);
        setSpentPoints(claims.reduce((sum, c) => sum + (c.cost || 0), 0));
      } catch {}
    }, 20000);
    // store cleanup on window
    // @ts-ignore
    global.__rewards_poll = interval;
  };

  const availablePoints = Math.max(ecoPoints - spentPoints, 0);
  const nextRewardCost = rewards.map(r => r.cost).sort((a,b) => a-b).find(c => c > availablePoints) || 0;
  const pointsToNext = nextRewardCost > 0 ? nextRewardCost - availablePoints : 0;

  const handleOpenClaim = (reward: RewardDefinition) => {
    setSelectedReward(reward);
    setShowClaimModal(true);
  };

  const confirmClaim = async () => {
    if (!selectedReward) return;
    if (availablePoints < selectedReward.cost) {
      Alert.alert('Not Enough Points', 'Earn more points to claim this reward.');
      return;
    }
    try {
      setClaiming(true);
      if (!user) return;
      const uid = (user._id || user.id || '').toString();
      const claim = await claimReward(uid, selectedReward.id);
      const updatedClaims = [claim, ...claimedRewards];
      setClaimedRewards(updatedClaims);
      setSpentPoints(updatedClaims.reduce((sum, c) => sum + (c.cost || 0), 0));
      // refresh stats to update ecoPoints
      const s = await getVolunteerStats(uid);
      setEcoPoints(s.ecoPoints);
      setShowClaimModal(false);
      Alert.alert('Reward Claimed', `"${selectedReward.title}" will be processed. Expect delivery/confirmation soon.`);
    } catch (e) {
      Alert.alert('Claim Failed', 'Unable to claim reward. Please retry.');
    } finally {
      setClaiming(false);
    }
  };

  const renderBadge = (badge: BadgeDefinition) => {
    const unlocked = tasksCompleted >= badge.threshold;
    return (
      <View key={badge.id} style={[styles.badgeCard, unlocked ? styles.badgeUnlocked : styles.badgeLocked]}>
        <IconSymbol name={badge.icon} size={24} color={unlocked ? '#4CAF50' : '#BDBDBD'} />
        <Text style={[styles.badgeTitle, unlocked ? styles.badgeTitleUnlocked : styles.badgeTitleLocked]} numberOfLines={1}>{badge.title}</Text>
        <Text style={styles.badgeStatus}>{unlocked ? 'Unlocked' : `${badge.threshold - tasksCompleted} left`}</Text>
      </View>
    );
  };

  const renderReward = (reward: RewardDefinition) => {
    const canClaim = availablePoints >= reward.cost;
    const claimedCount = claimedRewards.filter(c => c.rewardId === reward.id).length;
    return (
      <View key={reward.id} style={styles.rewardRow}>
        <View style={styles.rewardInfo}>
          <Text style={styles.rewardTitle}>{reward.title}</Text>
          <Text style={styles.rewardDesc}>{reward.description}</Text>
          <Text style={styles.rewardMeta}>{reward.cost} pts • {reward.sponsor}</Text>
          {claimedCount > 0 && (
            <Text style={styles.claimedBadge}>{claimedCount} claimed</Text>
          )}
        </View>
        <Pressable
          style={[styles.claimButton, !canClaim && styles.claimButtonDisabled]}
          disabled={!canClaim}
          onPress={() => handleOpenClaim(reward)}
        >
          <Text style={styles.claimButtonText}>{canClaim ? 'Claim' : 'Locked'}</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              if (!user) return;
              try {
                setRefreshing(true);
                await Promise.all([
                  loadStats(user),
                  loadRewards(user),
                  loadClaims(user),
                ]);
              } finally {
                setRefreshing(false);
              }
            }}
            colors={["#4CAF50"]}
          />
        }
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{user?.name ? user.name.charAt(0).toUpperCase() : 'V'}</Text>
          </View>
          <View style={styles.profileText}>
            <Text style={styles.name}>{user?.name || 'Volunteer'}</Text>
            <Text style={styles.roleLabel}>Volunteer</Text>
            <View style={styles.miniStatsRow}>
              <View style={styles.miniStat}><IconSymbol name="checkmark.circle.fill" size={16} color="#4CAF50" /><Text style={styles.miniStatText}>{tasksCompleted} done</Text></View>
              <View style={styles.miniStat}><IconSymbol name="clock.fill" size={16} color="#2196F3" /><Text style={styles.miniStatText}>{inProgress} active</Text></View>
              <View style={styles.miniStat}><IconSymbol name="star.fill" size={16} color="#FFB300" /><Text style={styles.miniStatText}>{availablePoints} pts</Text></View>
            </View>
          </View>
        </View>

        {/* Points Progress */}
        <View style={styles.pointsCard}>
          <Text style={styles.pointsHeading}>Your Points</Text>
          <View style={styles.pointsBarOuter}>
            <View style={[styles.pointsBarInner, { width: `${Math.min(100, (availablePoints / (nextRewardCost || availablePoints || 1)) * 100)}%` }]} />
          </View>
          <Text style={styles.pointsValue}>{availablePoints} pts available</Text>
          {pointsToNext > 0 ? (
            <Text style={styles.pointsNext}>{pointsToNext} pts to next reward</Text>
          ) : (
            <Text style={styles.pointsNext}>You can claim a reward now</Text>
          )}
        </View>

        {/* Badges Grid */}
        <Text style={styles.sectionHeading}>Badges</Text>
        <View style={styles.badgesGrid}>
          {BADGES.map(renderBadge)}
        </View>

        {/* Rewards List */}
        <Text style={styles.sectionHeading}>Rewards</Text>
        <View style={styles.rewardsList}>
          {rewards.map(renderReward)}
        </View>

        {/* Claimed Rewards History */}
        {claimedRewards.length > 0 && (
          <View style={styles.claimedSection}>
            <Text style={styles.sectionHeading}>Recent Claims</Text>
            {claimedRewards.slice(0, 5).map(c => {
              const reward = rewards.find(r => r.id === c.rewardId);
              return (
                <View key={c._id} style={styles.claimHistoryRow}>
                  <Text style={styles.claimHistoryTitle}>{reward?.title}</Text>
                  <Text style={styles.claimHistoryMeta}>{c.status === 'pending' ? 'Pending' : 'Delivered'} • {new Date(c.createdAt).toLocaleDateString()}</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Claim Modal */}
      <Modal
        visible={showClaimModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowClaimModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Claim Reward</Text>
              <Pressable onPress={() => setShowClaimModal(false)}>
                <IconSymbol name="xmark.circle.fill" size={28} color="#607D8B" />
              </Pressable>
            </View>
            <Text style={styles.modalDescription}>
              {selectedReward ? `Redeem "${selectedReward.title}" for ${selectedReward.cost} points? This will deduct points immediately.` : ''}
            </Text>
            <Pressable
              style={[styles.claimConfirmButton, claiming && styles.disabledButton]}
              disabled={claiming}
              onPress={confirmClaim}
            >
              <Text style={styles.claimConfirmText}>{claiming ? 'Processing...' : 'Confirm Claim'}</Text>
            </Pressable>
            <Pressable style={styles.cancelButton} onPress={() => setShowClaimModal(false)} disabled={claiming}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Text style={styles.deliveryNote}>Delivery or confirmation usually within 5–7 days.</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, paddingBottom: 120 },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
    marginBottom: 20,
  },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 26, fontWeight: '700', color: '#FFFFFF' },
  profileText: { marginLeft: 16, flex: 1 },
  name: { fontSize: 18, fontWeight: '700', color: '#333333' },
  roleLabel: { fontSize: 12, fontWeight: '600', color: '#607D8B', marginTop: 2 },
  miniStatsRow: { flexDirection: 'row', gap: 12, marginTop: 10, flexWrap: 'wrap' },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniStatText: { fontSize: 12, fontWeight: '600', color: '#607D8B' },
  pointsCard: {
    backgroundColor: 'rgba(76,175,80,0.08)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  pointsHeading: { fontSize: 16, fontWeight: '700', color: '#333333', marginBottom: 12 },
  pointsBarOuter: { width: '100%', height: 14, backgroundColor: '#E0E0E0', borderRadius: 7, overflow: 'hidden', marginBottom: 8 },
  pointsBarInner: { height: '100%', backgroundColor: '#4CAF50' },
  pointsValue: { fontSize: 14, fontWeight: '600', color: '#333333' },
  pointsNext: { fontSize: 12, color: '#607D8B', marginTop: 4 },
  sectionHeading: { fontSize: 16, fontWeight: '700', color: '#333333', marginBottom: 12 },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  badgeCard: {
    width: '30%',
    minWidth: 98,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  badgeUnlocked: { borderWidth: 2, borderColor: 'rgba(76,175,80,0.5)' },
  badgeLocked: { borderWidth: 2, borderColor: '#E0E0E0' },
  badgeTitle: { fontSize: 11, fontWeight: '700', marginTop: 6 },
  badgeTitleUnlocked: { color: '#333333' },
  badgeTitleLocked: { color: '#9E9E9E' },
  badgeStatus: { fontSize: 10, color: '#607D8B', marginTop: 2 },
  rewardsList: { gap: 14, marginBottom: 28 },
  rewardRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  rewardInfo: { flex: 1 },
  rewardTitle: { fontSize: 15, fontWeight: '700', color: '#333333', marginBottom: 2 },
  rewardDesc: { fontSize: 12, color: '#607D8B', marginBottom: 4 },
  rewardMeta: { fontSize: 11, fontWeight: '600', color: '#4CAF50' },
  claimedBadge: { fontSize: 10, color: '#9E9E9E', marginTop: 4 },
  claimButton: { alignSelf: 'center', backgroundColor: '#4CAF50', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  claimButtonDisabled: { backgroundColor: '#BDBDBD' },
  claimButtonText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  claimedSection: { marginBottom: 40 },
  claimHistoryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  claimHistoryTitle: { fontSize: 13, fontWeight: '600', color: '#333333' },
  claimHistoryMeta: { fontSize: 11, color: '#607D8B' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#333333' },
  modalDescription: { fontSize: 14, color: '#607D8B', marginBottom: 20 },
  claimConfirmButton: { backgroundColor: '#4CAF50', height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  claimConfirmText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  cancelButton: { height: 46, borderRadius: 23, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#607D8B' },
  deliveryNote: { fontSize: 11, color: '#607D8B', textAlign: 'center', marginTop: 8 },
  disabledButton: { opacity: 0.6 },
});
