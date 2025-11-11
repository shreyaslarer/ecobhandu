import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  Clipboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as ImagePicker from 'expo-image-picker';
import { getReportById, updateReportStatus, addComment, Report as APIReport, resolveReport } from '@/lib/api';
import { getSavedUser, User } from '@/lib/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Unified status constants (could extract to a separate file later)
const STATUS = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
} as const;
type TaskStatus = typeof STATUS[keyof typeof STATUS];

export default function VolunteerTaskDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const taskId = params.taskId as string;

  const [task, setTask] = useState<APIReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('Pending');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [afterPhotoUri, setAfterPhotoUri] = useState<string | null>(null);
  const [afterPhotoBase64, setAfterPhotoBase64] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [badgeProgress, setBadgeProgress] = useState(0);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);
  const [acceptedLocally, setAcceptedLocally] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [issueNotes, setIssueNotes] = useState('');
  const [reportingIssue, setReportingIssue] = useState(false);
  const getUserId = () => (user?._id || user?.id || '').toString();
  const asIdString = (val: any): string | null => {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && typeof val.$oid === 'string') return val.$oid;
    try { return String(val); } catch { return null; }
  };
  // Derived assignment flags to avoid relying solely on local AsyncStorage state
  const assignedToStr = task ? asIdString(task.assignedTo) : null;
  const isAssignedToUser = !!user && !!task && assignedToStr === getUserId();
  const isReservedByUser = isAssignedToUser && taskStatus === STATUS.PENDING;

  useEffect(() => {
    if (taskId) {
      initializePage();
    } else {
      Alert.alert('Error', 'Task ID is missing');
      router.back();
    }
  }, [taskId]);

  const initializePage = async () => {
    const saved = await loadUserData();
    await loadTaskDetails(saved);
    await loadLocalAcceptance();
    await fetchVolunteerLocation();
    await loadUserProgress();
  };

  const loadUserData = async () => {
    try {
      const savedUser = await getSavedUser();
      if (savedUser) {
        setUser(savedUser);
        return savedUser;
      }
      return null;
    } catch (error) {
      console.error('Error loading user:', error);
      return null;
    }
  };

  const loadUserProgress = async () => {
    try {
      // Load volunteer's completed tasks count for badge progress
      const savedProgress = await AsyncStorage.getItem('volunteer_completed_tasks');
      const count = savedProgress ? parseInt(savedProgress, 10) : 0;
      setCompletedTasksCount(count);
      
      // Calculate badge progress (e.g., Community Helper badge requires 20 tasks)
      const progress = Math.min((count / 20) * 100, 100);
      setBadgeProgress(progress);
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  // Accept optional savedUser to avoid relying on setState timing
  const loadTaskDetails = async (savedUserParam?: User | null) => {
    try {
      setLoading(true);
      console.log('Loading task details for ID:', taskId);
      const reportData = await getReportById(taskId);
  // Loaded task meta (suppress large base64 image in logs)
  console.log('Task loaded:', { id: reportData._id, status: reportData.status, severity: reportData.severity });
      setTask(reportData);
      setTaskStatus(reportData.status);
      // Hint-only: set local accepted flag if the server shows it's reserved by this user
      const assigned = asIdString(reportData.assignedTo);
      // Try to get a reliable saved user id (use param if provided, otherwise fall back to current state)
      const reliableUser = savedUserParam || (await getSavedUser());
      const reliableUserId = reliableUser ? (reliableUser._id || reliableUser.id || '').toString() : null;
      if (reportData.status === STATUS.PENDING && reliableUserId && assigned === reliableUserId) {
        setAcceptedLocally(true);
      } else {
        setAcceptedLocally(false);
      }
    } catch (error) {
      console.error('Error loading task details:', error);
      Alert.alert('Error', 'Failed to load task details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const LOCAL_ACCEPT_PREFIX = 'volunteer_task_accepted_';
  const loadLocalAcceptance = async () => {
    try {
      const stored = await AsyncStorage.getItem(LOCAL_ACCEPT_PREFIX + taskId);
      if (stored === 'true') setAcceptedLocally(true);
    } catch (e) {
      console.warn('Failed loading acceptance flag');
    }
  };
  const saveLocalAcceptance = async (accepted: boolean) => {
    try {
      if (accepted) {
        await AsyncStorage.setItem(LOCAL_ACCEPT_PREFIX + taskId, 'true');
      } else {
        await AsyncStorage.removeItem(LOCAL_ACCEPT_PREFIX + taskId);
      }
    } catch (e) {
      console.warn('Failed saving acceptance flag');
    }
  };

  const fetchVolunteerLocation = async () => {
    try {
      // Guard if expo-location isn't available in this runtime
      // (e.g., older Expo Go build without this module)
      if (!Location || typeof Location.requestForegroundPermissionsAsync !== 'function') {
        console.warn('Location module unavailable; skipping location fetch');
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      if (typeof Location.getCurrentPositionAsync !== 'function') return;
      const loc = await Location.getCurrentPositionAsync({});
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setCurrentLocation(coords);
      if (task?.coordinates) {
        const dist = haversineDistance(
          coords.latitude,
          coords.longitude,
          task.coordinates.latitude,
          task.coordinates.longitude
        );
        setDistanceKm(dist);
      }
    } catch (e) {
      console.log('Location fetch skipped/error', e);
    }
  };

  const toRad = (v: number) => (v * Math.PI) / 180;
  const haversineDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  };

  const handleAcceptTask = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to accept tasks');
      return;
    }

    try {
      setSubmitting(true);
      // Accept/reserve: assign volunteer but keep status Pending
      setAcceptedLocally(true); // optimistic reservation
      await saveLocalAcceptance(true);
      await updateReportStatus(taskId, STATUS.PENDING, getUserId());
      setTaskStatus(STATUS.PENDING);
      Alert.alert('Task Reserved', 'You have reserved this task. Tap Start Work when you begin.');
    } catch (error) {
      console.error('Error accepting task:', error);
      setAcceptedLocally(false);
      await saveLocalAcceptance(false);
      Alert.alert('Error', 'Failed to accept task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartWork = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in first');
      return;
    }
    try {
      setSubmitting(true);
      // Transition to In Progress on backend
      await updateReportStatus(taskId, STATUS.IN_PROGRESS, getUserId());
      setTaskStatus(STATUS.IN_PROGRESS);
      setAcceptedLocally(false);
      await saveLocalAcceptance(false);
      Alert.alert('Task Started', 'Focus on resolving the issue. Upload an after photo when done.');
    } catch (e) {
      console.error('Start work error', e);
      Alert.alert('Error', 'Unable to start work. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenResolveModal = () => {
    setShowResolveModal(true);
    setResolutionNotes('');
    setAfterPhotoUri(null);
    setAfterPhotoBase64(null);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      setAfterPhotoUri(result.assets[0].uri);
      setAfterPhotoBase64(result.assets[0].base64 || null);
    }
  };

  const handleMarkResolved = async () => {
    if (!afterPhotoBase64) {
      Alert.alert('Photo Required', 'Please upload an after photo to complete the task');
      return;
    }
    if (!resolutionNotes.trim()) {
      Alert.alert('Description Required', 'Please enter a brief description of the resolution.');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'Please log in to complete tasks');
      return;
    }
    try {
      setSubmitting(true);
      await resolveReport(taskId, getUserId(), `data:image/jpeg;base64,${afterPhotoBase64}`, resolutionNotes.trim());
      const newCount = completedTasksCount + 1;
      await AsyncStorage.setItem('volunteer_completed_tasks', newCount.toString());
      const pointsEarned = task?.severity === 'Critical' ? 50 : task?.severity === 'Major' ? 30 : 20;
      setTaskStatus('Resolved');
      setAcceptedLocally(false);
      await saveLocalAcceptance(false);
      setShowResolveModal(false);
      // Show a professional confirmation modal
      Alert.alert(
        'Task Completed',
        `✅ Well done!\n\nYou earned ${pointsEarned} EcoPoints for resolving this issue.\n\nThank you for making a difference!`,
        [
          {
            text: 'Back to My Tasks',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error completing task:', error);
      Alert.alert('Error', 'Failed to complete task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCallOrganizer = () => {
    // Contact is the reporter's email from the task
    if (task?.userEmail) {
      Linking.openURL(`mailto:${task.userEmail}`);
    } else {
      Alert.alert('Contact Info', 'Contact information not available');
    }
  };

  const handleCopyAddress = async () => {
    if (task?.location) {
      Clipboard.setString(task.location);
      Alert.alert('Copied!', 'Address copied to clipboard');
    }
  };

  const handleOpenInMaps = async () => {
    if (!task) return;

    const address = task.location || '';
    const hasCoords = !!task.coordinates && typeof task.coordinates.latitude === 'number' && typeof task.coordinates.longitude === 'number';
    const lat = hasCoords ? task.coordinates.latitude : undefined;
    const lng = hasCoords ? task.coordinates.longitude : undefined;

    try {
      if (Platform.OS === 'android') {
        // Prefer Google Maps app via navigation intent if available
        const navTarget = hasCoords ? `${lat},${lng}` : encodeURIComponent(address);
        const androidAppUrl = `google.navigation:q=${navTarget}&mode=d`;
        const androidWebUrl = hasCoords
          ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
          : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`;

        const supported = await Linking.canOpenURL(androidAppUrl);
        await Linking.openURL(supported ? androidAppUrl : androidWebUrl);
      } else {
        // iOS: Use Apple Maps, fallback to Google Maps web
        const dest = hasCoords ? `${lat},${lng}` : encodeURIComponent(address);
        const appleUrl = `http://maps.apple.com/?daddr=${dest}&dirflg=d`;
        const webUrl = hasCoords
          ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
          : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`;

        const supported = await Linking.canOpenURL(appleUrl);
        await Linking.openURL(supported ? appleUrl : webUrl);
      }
    } catch (err) {
      console.error('Failed to open maps:', err);
      Alert.alert('Unable to open Maps', 'Please install a maps app or try again later.');
    }
  };

  const getButtonConfig = () => {
    if (taskStatus === STATUS.RESOLVED) {
      return { text: 'Completed ✓', onPress: () => {}, color: '#9E9E9E' };
    }
    if (taskStatus === STATUS.PENDING) {
      // If this task is already reserved for this user, offer Start; otherwise offer Accept
      const reservedForUser = isReservedByUser || acceptedLocally;
      return reservedForUser
        ? { text: 'Start Work', onPress: handleStartWork, color: '#2196F3' }
        : { text: 'Accept Task', onPress: handleAcceptTask, color: '#4CAF50' };
    }
    if (taskStatus === STATUS.IN_PROGRESS) {
      return { text: 'Mark Resolved', onPress: handleOpenResolveModal, color: '#FF9800' };
    }
    return { text: 'Accept Task', onPress: handleAcceptTask, color: '#4CAF50' };
  };

  // If navigated from a card "Complete" intent, open resolve flow directly
  useEffect(() => {
    const intentResolve = (params as any).resolve === '1';
    if (!intentResolve || !taskStatus) return;
    if (taskStatus === STATUS.IN_PROGRESS) {
      setShowResolveModal(true);
    } else if (taskStatus === STATUS.PENDING && isReservedByUser) {
      // Prompt to start first
      Alert.alert('Start Required', 'Please start work before completing.', [
        { text: 'Start Work', onPress: handleStartWork },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [params, taskStatus, acceptedLocally]);

  const getUrgencyColor = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return '#FF5252';
      case 'Major':
        return '#FF9800';
      case 'Minor':
        return '#4CAF50';
      default:
        return '#4CAF50';
    }
  };

  const calculatePoints = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 50;
      case 'Major':
        return 30;
      case 'Minor':
        return 20;
      default:
        return 20;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading task details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Task not found</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const buttonConfig = getButtonConfig();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
        <Pressable style={styles.backIcon} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="#333333" />
        </Pressable>
        <Text style={styles.headerTitle}>Task Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Map/Preview */}
        <View style={styles.mapContainer}>
          {task.image ? (
            <Image
              source={{ 
                uri: task.image.startsWith('data:') 
                  ? task.image 
                  : `data:image/jpeg;base64,${task.image}` 
              }}
              style={styles.mapImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.mapImage, styles.placeholderImage]}>
              <IconSymbol name="photo" size={60} color="#BDBDBD" />
            </View>
          )}
          {/* Overlay press to open Maps for directions */}
          <Pressable style={{ position: 'absolute', inset: 0 }} onPress={handleOpenInMaps} />
          <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(task.severity) }]}>
            <Text style={styles.urgencyText}>{task.severity} Priority</Text>
          </View>
          {distanceKm !== null && (
            <View style={styles.routeBadge}>
              <IconSymbol name="mappin.and.ellipse" size={14} color="#FFFFFF" />
              <Text style={styles.routeBadgeText}>{distanceKm} km away</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.taskTitle}>{task.description}</Text>

        {/* Address (tap to open directions) */}
        <Pressable style={styles.infoCard} onPress={handleOpenInMaps}>
          <View style={styles.iconContainer}>
            <IconSymbol name="mappin.circle.fill" size={24} color="#4CAF50" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoValue}>{task.location}</Text>
          </View>
          <View style={styles.addressActions}>
            <View style={styles.navigatePill}>
              <IconSymbol name="chevron.right" size={16} color="#4CAF50" />
              <Text style={styles.navigatePillText}>Navigate</Text>
            </View>
          <Pressable
            style={styles.actionIcon}
            onPress={(e) => {
              e.stopPropagation();
              handleCopyAddress();
            }}
          >
            <IconSymbol name="doc.on.doc" size={20} color="#607D8B" />
          </Pressable>
          </View>
        </Pressable>

        {/* Category */}
        <View style={styles.infoCard}>
          <View style={styles.iconContainer}>
            <IconSymbol name="tag.fill" size={24} color="#4CAF50" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Category</Text>
            <Text style={styles.infoDescription}>{task.category}</Text>
          </View>
        </View>

        {/* Contact Reporter */}
        <View style={styles.infoCard}>
          <View style={styles.iconContainer}>
            <IconSymbol name="person.fill" size={24} color="#4CAF50" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Reported By</Text>
            <Text style={styles.infoValue}>{task.userName}</Text>
          </View>
          <Pressable style={styles.callButton} onPress={handleCallOrganizer}>
            <Text style={styles.callButtonText}>Contact</Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        {/* Impact Section */}
        <View style={styles.impactCard}>
          <Text style={styles.impactTitle}>Your Impact</Text>
          <View style={styles.impactContent}>
            <View style={styles.pointsSection}>
              <Text style={styles.pointsValue}>+{calculatePoints(task.severity)}</Text>
              <Text style={styles.pointsLabel}>Points</Text>
            </View>
            <View style={styles.impactDivider} />
            <View style={styles.badgeSection}>
              <Text style={styles.badgeTitle}>Community Helper</Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${badgeProgress}%` }]} />
              </View>
              <Text style={styles.progressText}>{Math.round(badgeProgress)}% Complete</Text>
            </View>
          </View>
        </View>

        {/* Issue Reporting Link */}
        {taskStatus !== 'Resolved' && (
          <Pressable style={styles.issueLinkContainer} onPress={() => setShowIssueModal(true)}>
            <IconSymbol name="exclamationmark.triangle.fill" size={18} color="#FF9800" />
            <Text style={styles.issueLinkText}>Report an issue with this task</Text>
          </Pressable>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Floating CTA Button */}
      <LinearGradient
        colors={['rgba(245, 245, 245, 0)', '#F5F5F5']}
        style={styles.ctaContainer}
      >
        {taskStatus !== 'Resolved' && (
          <View style={styles.ctaMeta}>
            <Text style={styles.ctaMetaPoints}>Earn +{calculatePoints(task.severity)} points</Text>
            {(isReservedByUser || (acceptedLocally && taskStatus === STATUS.PENDING)) && (
              <Text style={styles.ctaMetaHint}>Ready? Tap Start Work to begin.</Text>
            )}
            {!isReservedByUser && taskStatus === STATUS.PENDING && !task.assignedTo && (
              <Text style={styles.ctaMetaHint}>Accept to reserve this task.</Text>
            )}
            {taskStatus === STATUS.IN_PROGRESS && (
              <Text style={styles.ctaMetaHint}>Finish & upload after-photo to claim points.</Text>
            )}
          </View>
        )}
        <Pressable
          style={[styles.ctaButton, { backgroundColor: buttonConfig.color }]}
          onPress={buttonConfig.onPress}
          disabled={taskStatus === STATUS.RESOLVED || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.ctaButtonText}>{buttonConfig.text}</Text>
          )}
        </Pressable>
      </LinearGradient>

      {/* Resolve Modal */}
      <Modal
        visible={showResolveModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowResolveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complete Task</Text>
              <Pressable onPress={() => setShowResolveModal(false)}>
                <IconSymbol name="xmark.circle.fill" size={28} color="#607D8B" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalLabel}>Upload After Photo <Text style={{color:'#FF5252'}}>*</Text></Text>
              <Pressable style={styles.photoUploadButton} onPress={handlePickImage}>
                {afterPhotoUri ? (
                  <Image source={{ uri: afterPhotoUri }} style={styles.uploadedPhoto} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <IconSymbol name="camera.fill" size={40} color="#4CAF50" />
                    <Text style={styles.photoPlaceholderText}>Tap to upload photo</Text>
                  </View>
                )}
              </Pressable>
              <Text style={styles.modalLabel}>Resolution Description <Text style={{color:'#FF5252'}}>*</Text></Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Describe how you resolved the issue..."
                value={resolutionNotes}
                onChangeText={setResolutionNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={300}
              />
              <Pressable
                style={[styles.submitButton, (!afterPhotoBase64 || !resolutionNotes.trim() || submitting) && styles.submitButtonDisabled]}
                onPress={handleMarkResolved}
                disabled={!afterPhotoBase64 || !resolutionNotes.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit & Earn Points</Text>
                )}
              </Pressable>
              <Text style={{fontSize:12, color:'#607D8B', marginTop:8, textAlign:'center'}}>Both photo and description are required to complete the task.</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Issue Report Modal */}
      <Modal
        visible={showIssueModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowIssueModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report an Issue</Text>
              <Pressable onPress={() => setShowIssueModal(false)}>
                <IconSymbol name="xmark.circle.fill" size={28} color="#607D8B" />
              </Pressable>
            </View>
            <ScrollView>
              <Text style={styles.modalLabel}>Describe the problem *</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Hazard, access blocked, inaccurate location..."
                value={issueNotes}
                onChangeText={setIssueNotes}
                multiline
              />
              <Pressable
                style={[styles.submitButton, (!issueNotes || reportingIssue) && styles.submitButtonDisabled]}
                disabled={!issueNotes || reportingIssue}
                onPress={async () => {
                  if (!user || !task) return;
                  try {
                    setReportingIssue(true);
                    await addComment(task._id, user._id || user.id || 'unknown', user.name, `[ISSUE] ${issueNotes}`);
                    Alert.alert('Submitted', 'Issue reported to coordinators.');
                    setIssueNotes('');
                    setShowIssueModal(false);
                  } catch (e) {
                    console.error('Issue report failed', e);
                    Alert.alert('Error', 'Could not submit issue. Try again.');
                  } finally {
                    setReportingIssue(false);
                  }
                }}
              >
                {reportingIssue ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Issue</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#607D8B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#607D8B',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
  },
  backIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  mapContainer: {
    position: 'relative',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  mapImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  placeholderImage: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgencyBadge: {
    position: 'absolute',
    top: 24,
    right: 28,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  urgencyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  taskTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333333',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    lineHeight: 36,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    // For pressable address card feedback
  },
  infoCardPressable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    gap: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: '#607D8B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '600',
    lineHeight: 22,
  },
  infoDescription: {
    fontSize: 14,
    color: '#607D8B',
    lineHeight: 20,
  },
  actionIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navigatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  navigatePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    letterSpacing: 0.25,
  },
  callButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  callButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
    marginVertical: 16,
  },
  impactCard: {
    backgroundColor: 'rgba(165, 214, 167, 0.25)',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 12,
  },
  impactTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 16,
  },
  impactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  pointsSection: {
    alignItems: 'center',
    gap: 4,
  },
  pointsValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4CAF50',
  },
  pointsLabel: {
    fontSize: 13,
    color: '#607D8B',
    fontWeight: '500',
  },
  impactDivider: {
    width: 1,
    height: 48,
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  badgeSection: {
    flex: 1,
  },
  badgeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    color: '#607D8B',
    textAlign: 'right',
    marginTop: 4,
  },
  bottomSpacer: {
    height: 100,
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  ctaButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333333',
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
    marginTop: 16,
  },
  photoUploadButton: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  photoPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  uploadedPhoto: {
    width: '100%',
    height: '100%',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#333333',
    minHeight: 100,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  routeBadge: {
    position: 'absolute',
    bottom: 16,
    left: 24,
    backgroundColor: 'rgba(33, 150, 243, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  issueLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  issueLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
  },
  ctaMeta: {
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  ctaMetaPoints: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333333',
  },
  ctaMetaHint: {
    fontSize: 12,
    color: '#607D8B',
    marginTop: 4,
  },
});
