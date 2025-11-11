import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getReports, Report as APIReport, updateReportStatus } from '@/lib/api';
import { getSavedUser, User } from '@/lib/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface VolunteerStats {
  tasksCompleted: number;
  inProgress: number;
  ecoPoints: number;
  rating: number;
}

export default function VolunteerHomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'nearby' | 'assigned' | 'completed'>('nearby');
  const [nearbyReports, setNearbyReports] = useState<APIReport[]>([]);
  const [assignedReports, setAssignedReports] = useState<APIReport[]>([]);
  const [completedReports, setCompletedReports] = useState<APIReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<APIReport | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [bottomTab, setBottomTab] = useState<'home' | 'tasks' | 'profile'>('home');
  const [stats, setStats] = useState<VolunteerStats>({
    tasksCompleted: 0,
    inProgress: 0,
    ecoPoints: 0,
    rating: 0,
  });
  const [declinedTasks, setDeclinedTasks] = useState<Set<string>>(new Set());
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    initializeApp();
  }, []);

  // Refresh on screen focus to reflect latest citizen updates (real-time enough without sockets)
  useEffect(() => {
    const interval = setInterval(() => {
      // Light polling every 20s while screen is mounted
      loadAllData();
      if (user) calculateStats((user._id || user.id || '').toString());
    }, 20000);
    return () => clearInterval(interval);
  }, [user]);

  // Also refresh when navigating back to this screen
  useEffect(() => {
    // Expo Router doesn't expose listeners here easily; rely on polling + pull to refresh
    // This block is a placeholder for future focus-based refresh if needed.
    return () => {
      // no-op
    };
  }, []);

  useEffect(() => {
    loadDeclinedTasks();
  }, []);

  const initializeApp = async () => {
    await loadUserData();
    await loadAllData();
  };

  const loadUserData = async () => {
    try {
      const savedUser = await getSavedUser();
      if (savedUser) {
        setUser(savedUser);
        await calculateStats((savedUser._id || savedUser.id || '').toString());
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const asIdString = (val: any): string | null => {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && typeof val.$oid === 'string') return val.$oid;
    try { return String(val); } catch { return null; }
  };

  const calculateStats = async (userId: string) => {
    try {
      // Load all reports to calculate stats
      const allReports = await getReports({ limit: 200 });
      
      if (Array.isArray(allReports)) {
        const userAssigned = allReports.filter((r) => asIdString(r.assignedTo) === userId);
        const completed = userAssigned.filter((r) => r.status === 'Resolved').length;
        const inProgress = userAssigned.filter((r) => r.status === 'In Progress').length;
        
        // Calculate EcoPoints (10 points per completed task, 5 for in-progress)
        const ecoPoints = (completed * 10) + (inProgress * 5);
        
        // Mock rating calculation (would come from backend in production)
        const rating = completed > 0 ? Math.min(5, 4.0 + (completed * 0.1)) : 0;
        
        // Calculate notification count (new pending tasks)
        const newTasks = allReports.filter((r) => r.status === 'Pending' && !r.assignedTo).length;
        setNotificationCount(Math.min(newTasks, 9)); // Max 9 for display
        
        setStats({
          tasksCompleted: completed,
          inProgress: inProgress,
          ecoPoints: ecoPoints,
          rating: parseFloat(rating.toFixed(1)),
        });
      }
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      const savedUser = await getSavedUser();
      if (!savedUser) return;
      const userId = (savedUser._id || savedUser.id || '').toString();

      // Load nearby pending reports
      const allReports = await getReports({ limit: 50 });
      
      if (Array.isArray(allReports)) {
        // Filter reports based on status and assignment
        const nearby = allReports.filter((r) => 
          r.status === 'Pending' && !r.assignedTo
        );
        
        const assigned = allReports.filter((r) => 
          asIdString(r.assignedTo) === userId && (r.status === 'In Progress' || r.status === 'Pending')
        );
        
        const completed = allReports.filter((r) => 
          asIdString(r.assignedTo) === userId && r.status === 'Resolved'
        );

        setNearbyReports(nearby);
        setAssignedReports(assigned);
        setCompletedReports(completed);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadDeclinedTasks = async () => {
    try {
      const declined = await AsyncStorage.getItem('declined_tasks');
      if (declined) {
        setDeclinedTasks(new Set(JSON.parse(declined)));
      }
    } catch (error) {
      console.error('Error loading declined tasks:', error);
    }
  };

  const saveDeclinedTask = async (taskId: string) => {
    try {
      const updated = new Set(declinedTasks);
      updated.add(taskId);
      setDeclinedTasks(updated);
      await AsyncStorage.setItem('declined_tasks', JSON.stringify(Array.from(updated)));
    } catch (error) {
      console.error('Error saving declined task:', error);
    }
  };

  const onRefresh = useCallback(() => {
    loadAllData();
    if (user) {
      calculateStats((user._id || user.id || '').toString());
    }
  }, [user]);

  const handleAcceptTask = async (report: APIReport) => {
    if (!user) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    setSelectedReport(report);
    setShowModal(true);
  };

  const confirmAcceptTask = async () => {
    if (!selectedReport || !user || accepting) return;

    try {
      setAccepting(true);
      // Reserve task for the volunteer: assign but keep status Pending
      await updateReportStatus(
        selectedReport._id,
        'Pending',
        (user._id || user.id || '').toString()
      );

      // Update local state: move to assigned with Reserved state (Pending)
      setNearbyReports((prev) => prev.filter((r) => r._id !== selectedReport._id));
      setAssignedReports((prev) => [
        ...prev,
        { ...selectedReport, status: 'Pending', assignedTo: (user._id || user.id || '').toString() },
      ]);
      
      // Recalculate stats
      await calculateStats((user._id || user.id || '').toString());
      
      Alert.alert(
        'Task Reserved',
        `You've reserved "${selectedReport.description}". When ready, tap Start to begin.`,
        [{ text: 'OK', onPress: () => setShowModal(false) }]
      );
    } catch (error) {
      console.error('Error accepting task:', error);
      Alert.alert('Error', 'Failed to accept task. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async (reportId: string) => {
    Alert.alert(
      'Decline Task',
      'Are you sure you want to decline this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            await saveDeclinedTask(reportId);
            setNearbyReports((prev) => prev.filter((r) => r._id !== reportId));
            Alert.alert('Task Declined', 'This task has been removed from your list.');
          },
        },
      ]
    );
  };

  const navigateToLocation = () => {
    setShowModal(false);
    if (selectedReport) {
      router.push(`/report-detail?id=${selectedReport._id}`);
    }
  };

  const viewInMyTasks = () => {
    setShowModal(false);
    setActiveTab('assigned');
  };

  const handleCompleteTask = async (reportId: string) => {
    // Redirect to detail screen with resolve intent to ensure after photo & notes are captured
    router.push(`/volunteer-task-detail?taskId=${reportId}&resolve=1`);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Waste Management': '#4CAF50',
      'Water Pollution': '#2196F3',
      'Air Quality': '#9C27B0',
      'Illegal Dumping': '#F44336',
      'Tree Planting': '#8BC34A',
      'Waste Cleanup': '#FF9800',
    };
    return colors[category] || '#4CAF50';
  };

  const getEstimatedTime = (severity: string) => {
    const times: Record<string, string> = {
      High: '~45 min',
      Medium: '~1 hour',
      Low: '~30 min',
    };
    return times[severity] || '~30 min';
  };

  const getDistance = () => {
    const distances = ['1.2 km', '2.5 km', '3.1 km', '0.8 km', '4.2 km'];
    return distances[Math.floor(Math.random() * distances.length)];
  };

  const renderOpportunityCard = (report: APIReport) => {
    const imageUri = report.image
      ? report.image.startsWith('data:')
        ? report.image
        : `data:image/jpeg;base64,${report.image}`
      : null;

    const categoryColor = getCategoryColor(report.category);
    const isUrgent = report.severity === 'Critical' || report.severity === 'Major';

    return (
      <Pressable
        key={report._id}
        style={styles.card}
        onPress={() => {
          console.log('Card pressed, navigating to task detail:', report._id);
          router.push(`/volunteer-task-detail?taskId=${report._id}`);
        }}
      >
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.cardImage} />
          ) : (
            <View style={[styles.cardImage, styles.placeholderImage]}>
              <IconSymbol name="photo" size={48} color="#BDBDBD" />
            </View>
          )}
          {isUrgent && (
            <View style={styles.urgentBadge}>
              <IconSymbol name="flame.fill" size={18} color="#FFFFFF" />
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}15` }]}>
            <Text style={[styles.categoryText, { color: categoryColor }]}>
              {report.category.toUpperCase()}
            </Text>
          </View>

          <Text style={styles.cardTitle}>{report.description}</Text>

          <Text style={styles.cardDescription} numberOfLines={2}>
            {report.location}
          </Text>

          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <IconSymbol name="location.fill" size={16} color="#607D8B" />
              <Text style={styles.metaText}>{getDistance()} away</Text>
            </View>
            <View style={styles.metaItem}>
              <IconSymbol name="clock.fill" size={16} color="#607D8B" />
              <Text style={styles.metaText}>{getEstimatedTime(report.severity)}</Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <Pressable
              style={styles.declineButton}
              onPress={(e) => {
                e.stopPropagation();
                handleDecline(report._id);
              }}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </Pressable>
            <Pressable
              style={styles.acceptButton}
              onPress={(e) => {
                e.stopPropagation();
                handleAcceptTask(report);
              }}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderAssignedCard = (report: APIReport) => {
    const imageUri = report.image
      ? report.image.startsWith('data:')
        ? report.image
        : `data:image/jpeg;base64,${report.image}`
      : null;

    const categoryColor = getCategoryColor(report.category);

    return (
      <Pressable
        key={report._id}
        style={styles.card}
        onPress={() => {
          console.log('Assigned card pressed, navigating to task detail:', report._id);
          router.push(`/volunteer-task-detail?taskId=${report._id}`);
        }}
      >
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.cardImage} />
          ) : (
            <View style={[styles.cardImage, styles.placeholderImage]}>
              <IconSymbol name="photo" size={48} color="#BDBDBD" />
            </View>
          )}
          {report.status === 'In Progress' ? (
            <View style={styles.inProgressBadge}>
              <IconSymbol name="clock.fill" size={16} color="#FFFFFF" />
              <Text style={styles.badgeText}>IN PROGRESS</Text>
            </View>
          ) : (
            <View style={styles.reservedBadge}>
              <IconSymbol name="tag.fill" size={16} color="#FFFFFF" />
              <Text style={styles.badgeText}>RESERVED</Text>
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}15` }]}>
            <Text style={[styles.categoryText, { color: categoryColor }]}>
              {report.category.toUpperCase()}
            </Text>
          </View>

          <Text style={styles.cardTitle}>{report.description}</Text>

          <Text style={styles.cardDescription} numberOfLines={2}>
            {report.location}
          </Text>

          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <IconSymbol name="location.fill" size={16} color="#607D8B" />
              <Text style={styles.metaText}>{getDistance()} away</Text>
            </View>
            <View style={styles.metaItem}>
              <IconSymbol name="calendar" size={16} color="#607D8B" />
              <Text style={styles.metaText}>
                {new Date(report.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <Pressable
              style={styles.viewDetailsButton}
              onPress={(e) => {
                e.stopPropagation();
                console.log('View Details button pressed for task:', report._id);
                router.push(`/volunteer-task-detail?taskId=${report._id}`);
              }}
            >
              <Text style={styles.viewDetailsButtonText}>View Details</Text>
            </Pressable>
            {report.status === 'In Progress' ? (
              <Pressable
                style={styles.completeButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleCompleteTask(report._id);
                }}
              >
                <IconSymbol name="checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.completeButtonText}>Complete</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.completeButton}
                onPress={async (e) => {
                  e.stopPropagation();
                  try {
                    if (!user) return;
                    await updateReportStatus(report._id, 'In Progress', (user._id || user.id || '').toString());
                    // update local state
                    setAssignedReports((prev) => prev.map(r => r._id === report._id ? { ...r, status: 'In Progress' } : r));
                    await calculateStats((user._id || user.id || '').toString());
                  } catch (err) {
                    Alert.alert('Error', 'Failed to start work. Please try again.');
                  }
                }}
              >
                <IconSymbol name="clock.fill" size={16} color="#FFFFFF" />
                <Text style={styles.completeButtonText}>Start</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  const renderCompletedCard = (report: APIReport) => {
    const imageUri = report.image
      ? report.image.startsWith('data:')
        ? report.image
        : `data:image/jpeg;base64,${report.image}`
      : null;

    const categoryColor = getCategoryColor(report.category);

    return (
      <Pressable
        key={report._id}
        style={styles.card}
        onPress={() => {
          console.log('Completed card pressed, navigating to task detail:', report._id);
          router.push(`/volunteer-task-detail?taskId=${report._id}`);
        }}
      >
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.cardImage} />
          ) : (
            <View style={[styles.cardImage, styles.placeholderImage]}>
              <IconSymbol name="photo" size={48} color="#BDBDBD" />
            </View>
          )}
          <View style={styles.completedBadge}>
            <IconSymbol name="checkmark.circle.fill" size={16} color="#FFFFFF" />
            <Text style={styles.badgeText}>COMPLETED</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}15` }]}>
            <Text style={[styles.categoryText, { color: categoryColor }]}>
              {report.category.toUpperCase()}
            </Text>
          </View>

          <Text style={styles.cardTitle}>{report.description}</Text>

          <Text style={styles.cardDescription} numberOfLines={2}>
            {report.location}
          </Text>

          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <IconSymbol name="calendar" size={16} color="#607D8B" />
              <Text style={styles.metaText}>
                Completed on {new Date(report.updatedAt || report.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>

          <View style={styles.completedFooter}>
            <View style={styles.ecoPointsEarned}>
              <IconSymbol name="star.fill" size={20} color="#FFB300" />
              <Text style={styles.ecoPointsText}>+10 EcoPoints Earned</Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Profile */}
      <LinearGradient colors={['#4CAF50', '#45A049']} style={styles.header}>
        <View style={styles.headerTop}>
          <Image
            source={require('@/assets/images/ecobhandulogo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.headerRight}>
            <Pressable 
              style={styles.profileSection}
              onPress={() => setShowProfileModal(true)}
            >
              <View style={styles.profileInfo}>
                <Text style={styles.greeting}>Welcome back,</Text>
                <Text style={styles.userName}>{user?.name || 'Volunteer'}</Text>
              </View>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileInitial}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'V'}
                </Text>
              </View>
            </Pressable>
            <Pressable 
              style={styles.rewardsButton}
              onPress={() => router.push('/volunteer-rewards')}
            >
              <IconSymbol name="star.fill" size={22} color="#FFFFFF" />
            </Pressable>
            <Pressable 
              style={styles.notificationButton}
              onPress={() => {
                // TODO: Open notifications
              }}
            >
              <IconSymbol name="bell.fill" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.tasksCompleted}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.inProgress}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.rating}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.ecoPoints}</Text>
            <Text style={styles.statLabel}>EcoPoints</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={styles.tabNav}>
        <Pressable
          style={[styles.tabButton, activeTab === 'nearby' && styles.tabButtonActive]}
          onPress={() => setActiveTab('nearby')}
        >
          <IconSymbol
            name="map.fill"
            size={20}
            color={activeTab === 'nearby' ? '#4CAF50' : '#607D8B'}
          />
          <Text style={[styles.tabButtonText, activeTab === 'nearby' && styles.tabButtonTextActive]}>
            Nearby
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === 'assigned' && styles.tabButtonActive]}
          onPress={() => setActiveTab('assigned')}
        >
          <IconSymbol
            name="checkmark.circle.fill"
            size={20}
            color={activeTab === 'assigned' ? '#4CAF50' : '#607D8B'}
          />
          <Text style={[styles.tabButtonText, activeTab === 'assigned' && styles.tabButtonTextActive]}>
            My Tasks
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === 'completed' && styles.tabButtonActive]}
          onPress={() => setActiveTab('completed')}
        >
          <IconSymbol
            name="star.fill"
            size={20}
            color={activeTab === 'completed' ? '#4CAF50' : '#607D8B'}
          />
          <Text style={[styles.tabButtonText, activeTab === 'completed' && styles.tabButtonTextActive]}>
            Completed
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} colors={['#4CAF50']} />
        }
      >
        {activeTab === 'nearby' && (
          <>
            <Text style={styles.sectionTitle}>Nearby Opportunities ({nearbyReports.length})</Text>
            {loading && nearbyReports.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Loading opportunities...</Text>
              </View>
            ) : Array.isArray(nearbyReports) && nearbyReports.length > 0 ? (
              nearbyReports
                .filter((r) => !declinedTasks.has(r._id))
                .map((report) => renderOpportunityCard(report))
            ) : (
              <View style={styles.emptyState}>
                <IconSymbol name="checkmark.circle" size={64} color="#BDBDBD" />
                <Text style={styles.emptyText}>No opportunities available</Text>
                <Text style={styles.emptySubtext}>Check back later for new tasks</Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'assigned' && (
          <>
            <Text style={styles.sectionTitle}>My Assigned Tasks ({assignedReports.length})</Text>
            {Array.isArray(assignedReports) && assignedReports.length > 0 ? (
              assignedReports.map((report) => renderAssignedCard(report))
            ) : (
              <View style={styles.emptyState}>
                <IconSymbol name="list.bullet" size={64} color="#BDBDBD" />
                <Text style={styles.emptyText}>No assigned tasks yet</Text>
                <Text style={styles.emptySubtext}>Accept tasks from nearby opportunities</Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'completed' && (
          <>
            <Text style={styles.sectionTitle}>Completed Tasks ({completedReports.length})</Text>
            {Array.isArray(completedReports) && completedReports.length > 0 ? (
              completedReports.map((report) => renderCompletedCard(report))
            ) : (
              <View style={styles.emptyState}>
                <IconSymbol name="star.circle" size={64} color="#BDBDBD" />
                <Text style={styles.emptyText}>No completed tasks</Text>
                <Text style={styles.emptySubtext}>Complete tasks to see them here</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <Pressable
          style={styles.bottomNavItem}
          onPress={() => setBottomTab('home')}
        >
          <IconSymbol
            name="house.fill"
            size={24}
            color={bottomTab === 'home' ? '#4CAF50' : '#9E9E9E'}
          />
          <Text style={[styles.bottomNavText, bottomTab === 'home' && styles.bottomNavTextActive]}>
            Home
          </Text>
        </Pressable>
        <Pressable
          style={styles.bottomNavItem}
          onPress={() => setBottomTab('tasks')}
        >
          <IconSymbol
            name="list.bullet.clipboard"
            size={24}
            color={bottomTab === 'tasks' ? '#4CAF50' : '#9E9E9E'}
          />
          <Text style={[styles.bottomNavText, bottomTab === 'tasks' && styles.bottomNavTextActive]}>
            Tasks
          </Text>
        </Pressable>
        <Pressable
          style={styles.bottomNavItem}
          onPress={() => setBottomTab('profile')}
        >
          <IconSymbol
            name="person.circle.fill"
            size={24}
            color={bottomTab === 'profile' ? '#4CAF50' : '#9E9E9E'}
          />
          <Text style={[styles.bottomNavText, bottomTab === 'profile' && styles.bottomNavTextActive]}>
            Profile
          </Text>
        </Pressable>
      </View>

      {/* Confirmation Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => !accepting && setShowModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => !accepting && setShowModal(false)}
          disabled={accepting}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalIconContainer}>
              <IconSymbol name="checkmark.circle.fill" size={56} color="#4CAF50" />
            </View>

            <Text style={styles.modalTitle}>Accept This Task?</Text>

            <Text style={styles.modalDescription}>
              You'll be assigned to "{selectedReport?.description}"{selectedReport?.location ? ` at ${selectedReport.location}` : ''}. Ready to make a difference?
            </Text>

            {accepting && (
              <ActivityIndicator size="large" color="#4CAF50" style={{ marginVertical: 16 }} />
            )}

            <View style={styles.modalActions}>
              <Pressable 
                style={[styles.modalPrimaryButton, accepting && styles.buttonDisabled]} 
                onPress={confirmAcceptTask}
                disabled={accepting}
              >
                {accepting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <IconSymbol name="checkmark.circle" size={20} color="#FFFFFF" />
                    <Text style={styles.modalPrimaryButtonText}>Yes, Accept Task</Text>
                  </>
                )}
              </Pressable>
              <Pressable 
                style={styles.modalSecondaryButton} 
                onPress={() => setShowModal(false)}
                disabled={accepting}
              >
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Profile Modal */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowProfileModal(false)}>
          <Pressable style={styles.profileModalContent} onPress={(e) => e.stopPropagation()}>
            {/* Profile Header */}
            <View style={styles.profileModalHeader}>
              <View style={styles.profileModalAvatar}>
                <Text style={styles.profileModalInitial}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'V'}
                </Text>
              </View>
              <Text style={styles.profileModalName}>{user?.name || 'Volunteer'}</Text>
              <Text style={styles.profileModalEmail}>{user?.email || ''}</Text>
            </View>

            {/* Stats Grid */}
            <View style={styles.profileStatsGrid}>
              <View style={styles.profileStatItem}>
                <IconSymbol name="checkmark.circle.fill" size={32} color="#4CAF50" />
                <Text style={styles.profileStatValue}>{stats.tasksCompleted}</Text>
                <Text style={styles.profileStatLabel}>Completed</Text>
              </View>
              <View style={styles.profileStatItem}>
                <IconSymbol name="clock.fill" size={32} color="#2196F3" />
                <Text style={styles.profileStatValue}>{stats.inProgress}</Text>
                <Text style={styles.profileStatLabel}>In Progress</Text>
              </View>
              <View style={styles.profileStatItem}>
                <IconSymbol name="star.fill" size={32} color="#FFB300" />
                <Text style={styles.profileStatValue}>{stats.ecoPoints}</Text>
                <Text style={styles.profileStatLabel}>EcoPoints</Text>
              </View>
              <View style={styles.profileStatItem}>
                <IconSymbol name="star.circle.fill" size={32} color="#FF9800" />
                <Text style={styles.profileStatValue}>{stats.rating}</Text>
                <Text style={styles.profileStatLabel}>Rating</Text>
              </View>
            </View>

            {/* Profile Options */}
            <View style={styles.profileOptions}>
              <Pressable 
                style={styles.profileOption}
                onPress={() => {
                  setShowProfileModal(false);
                  router.push('/volunteer-rewards');
                }}
              >
                <IconSymbol name="star.fill" size={20} color="#4CAF50" />
                <Text style={styles.profileOptionText}>Rewards & Badges</Text>
                <IconSymbol name="chevron.right" size={16} color="#9E9E9E" />
              </Pressable>
              <Pressable style={styles.profileOption}>
                <IconSymbol name="person.fill" size={20} color="#4CAF50" />
                <Text style={styles.profileOptionText}>Edit Profile</Text>
                <IconSymbol name="chevron.right" size={16} color="#9E9E9E" />
              </Pressable>
              <Pressable style={styles.profileOption}>
                <IconSymbol name="bell.fill" size={20} color="#4CAF50" />
                <Text style={styles.profileOptionText}>Notifications</Text>
                <IconSymbol name="chevron.right" size={16} color="#9E9E9E" />
              </Pressable>
              <Pressable style={styles.profileOption}>
                <IconSymbol name="gear" size={20} color="#4CAF50" />
                <Text style={styles.profileOptionText}>Settings</Text>
                <IconSymbol name="chevron.right" size={16} color="#9E9E9E" />
              </Pressable>
            </View>

            {/* Close Button */}
            <Pressable 
              style={styles.profileCloseButton}
              onPress={() => setShowProfileModal(false)}
            >
              <Text style={styles.profileCloseButtonText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginRight: -20,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 'auto',
    paddingRight: 20,
  },
  logo: {
    width: 40,
    height: 40,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  profileInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  profileInfo: {
    marginRight: 8,
    alignItems: 'flex-end',
  },
  greeting: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 2,
    fontWeight: '500',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notificationButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  rewardsButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF5252',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
  },
  tabNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#607D8B',
  },
  tabButtonTextActive: {
    color: '#4CAF50',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 7,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E0E0E0',
  },
  placeholderImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF9800',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  cardContent: {
    padding: 16,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8,
    lineHeight: 22,
  },
  cardDescription: {
    fontSize: 14,
    color: '#607D8B',
    lineHeight: 20,
    marginBottom: 12,
  },
  metaContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#607D8B',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  declineButton: {
    minWidth: 84,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(96, 125, 139, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#607D8B',
  },
  acceptButton: {
    minWidth: 84,
    height: 38,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  bottomNavText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9E9E9E',
    marginTop: 4,
  },
  bottomNavTextActive: {
    color: '#4CAF50',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#757575',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BDBDBD',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 15,
    color: '#607D8B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  modalActions: {
    width: '100%',
    gap: 12,
  },
  modalPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 50,
    backgroundColor: '#4CAF50',
    borderRadius: 999,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  modalPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalSecondaryButton: {
    width: '100%',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  modalSecondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#607D8B',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#607D8B',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  inProgressBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#2196F3',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  completedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  reservedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFC107',
    shadowColor: '#FFC107',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  viewDetailsButton: {
    minWidth: 100,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewDetailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 100,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  completedFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  ecoPointsEarned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  ecoPointsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFB300',
  },
  profileModalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    position: 'absolute',
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  profileModalHeader: {
    alignItems: 'center',
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  profileModalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#E8F5E9',
  },
  profileModalInitial: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileModalName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 4,
  },
  profileModalEmail: {
    fontSize: 14,
    color: '#607D8B',
  },
  profileStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  profileStatItem: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  profileStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
    marginTop: 8,
  },
  profileStatLabel: {
    fontSize: 12,
    color: '#607D8B',
    marginTop: 4,
  },
  profileOptions: {
    paddingVertical: 16,
  },
  profileOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  profileOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginLeft: 12,
  },
  profileCloseButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#F5F5F5',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  profileCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#607D8B',
  },
});
