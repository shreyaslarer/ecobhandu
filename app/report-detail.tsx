import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Linking,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getReportById, updateReportStatus, Report } from '@/lib/api';
import { getSavedUser } from '@/lib/auth';

const { width } = Dimensions.get('window');

// Status timeline steps
const STATUS_STEPS = [
  { id: 1, label: 'Reported', icon: 'flag', status: 'Pending' },
  { id: 2, label: 'Verified', icon: 'checkmark-circle', status: 'Pending' },
  { id: 3, label: 'Assigned', icon: 'person', status: 'In Progress' },
  { id: 4, label: 'In Progress', icon: 'hammer', status: 'In Progress' },
  { id: 5, label: 'Resolved', icon: 'shield-checkmark', status: 'Resolved' },
];

type Urgency = 'High' | 'Medium' | 'Low';

const urgencyStyles: Record<string, { bg: string; text: string }> = {
  High: { bg: '#FEE2E2', text: '#991B1B' },
  Medium: { bg: '#FFEDD5', text: '#9A3412' },
  Low: { bg: '#FEF3C7', text: '#92400E' },
};

const getStatusStep = (status: string): number => {
  switch (status) {
    case 'Pending':
      return 2;
    case 'In Progress':
      return 4;
    case 'Resolved':
      return 5;
    case 'Rejected':
      return 1;
    default:
      return 1;
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
};

export default function ReportDetailScreen() {
  const params = useLocalSearchParams();
  const reportId = params.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
    loadUser();
  }, [reportId]);

  const loadUser = async () => {
    const user = await getSavedUser();
    if (user && user._id) setUserId(user._id);
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      if (!reportId) {
        Alert.alert('Error', 'Invalid report ID');
        router.back();
        return;
      }
      const data = await getReportById(reportId);
      setReport(data);
    } catch (error) {
      console.error('Error loading report:', error);
      Alert.alert('Error', 'Failed to load report details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    // In real app, this would be volunteer's phone
    Alert.alert('Call Volunteer', 'Feature coming soon');
  };

  const handleTrack = () => {
    if (!report?.coordinates) return;
    const url = Platform.select({
      ios: `maps:?q=${report.coordinates.latitude},${report.coordinates.longitude}`,
      android: `geo:${report.coordinates.latitude},${report.coordinates.longitude}`,
    });
    if (url) Linking.openURL(url);
  };

  const handleConfirmResolved = async () => {
    try {
      if (!report?._id) return;
      await updateReportStatus(report._id, 'Resolved');
      setConfirmed(true);
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.error('Error confirming resolution:', error);
      Alert.alert('Error', 'Failed to confirm resolution');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5e8c61" />
          <Text style={styles.loadingText}>Loading report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Report not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentStep = getStatusStep(report.status);
  const severity = report.severity || 'Medium';
  const urgencyColor = urgencyStyles[severity] || urgencyStyles.Medium;
  const isOwner = userId === report.userId;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#333333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Issue Details</Text>
        <TouchableOpacity style={styles.moreButton} activeOpacity={0.7}>
          <Ionicons name="ellipsis-vertical" size={24} color="#333333" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Thumbnail & Title Section */}
        <View style={styles.thumbnailSection}>
          {report.image ? (
            <Image
              source={{ 
                uri: report.image.startsWith('data:') 
                  ? report.image 
                  : `data:image/jpeg;base64,${report.image}` 
              }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Ionicons name="image-outline" size={64} color="#999" />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.thumbnailGradient}
          />
          <View style={styles.thumbnailOverlay}>
            <Text style={styles.issueTitle}>{report.category || 'Unknown Issue'}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.urgencyPill, { backgroundColor: urgencyColor.bg }]}>
                <Ionicons name="alert-circle" size={14} color={urgencyColor.text} />
                <Text style={[styles.urgencyText, { color: urgencyColor.text }]}>
                  {severity} Severity
                </Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{report.status || 'Pending'}</Text>
              </View>
              {isOwner && (
                <View style={styles.ownerBadge}>
                  <Text style={styles.ownerText}>Your Report</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Status Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>Status Timeline</Text>
          <View style={styles.timeline}>
            {STATUS_STEPS.map((step, index) => {
              const isActive = step.id <= currentStep;
              const isCurrent = step.id === currentStep;
              return (
                <View key={step.id} style={styles.timelineStep}>
                  <View style={styles.timelineIconContainer}>
                    <View
                      style={[
                        styles.timelineIcon,
                        isActive && styles.timelineIconActive,
                        isCurrent && styles.timelineIconCurrent,
                      ]}
                    >
                      <Ionicons
                        name={step.icon as any}
                        size={18}
                        color={isActive ? '#FFFFFF' : '#999999'}
                      />
                    </View>
                    {index < STATUS_STEPS.length - 1 && (
                      <View
                        style={[
                          styles.timelineLine,
                          isActive && styles.timelineLineActive,
                        ]}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.timelineLabel,
                      isActive && styles.timelineLabelActive,
                      isCurrent && styles.timelineLabelCurrent,
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Mini Map & Location */}
        <View style={styles.mapSection}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.mapCard}>
            <TouchableOpacity 
              style={styles.mapPlaceholder}
              onPress={handleTrack}
              activeOpacity={0.7}
            >
              <Ionicons name="map" size={48} color="#5e8c61" />
              <Text style={styles.mapPlaceholderText}>Tap to view on map</Text>
            </TouchableOpacity>
            <View style={styles.mapInfo}>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={20} color="#5e8c61" />
                <Text style={styles.locationText}>{report.location || 'Location not specified'}</Text>
              </View>
              {report.coordinates && report.coordinates.latitude && report.coordinates.longitude && (
                <Text style={styles.coordinatesText}>
                  {report.coordinates.latitude.toFixed(6)}, {report.coordinates.longitude.toFixed(6)}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Volunteer Assignment Card - Only show if In Progress or Resolved */}
        {(report.status === 'In Progress' || report.status === 'Resolved') && (
          <View style={styles.volunteerSection}>
            <Text style={styles.sectionTitle}>Assigned Volunteer</Text>
            <View style={styles.volunteerCard}>
              <View style={styles.volunteerInfo}>
                <View style={styles.volunteerAvatar}>
                  <Ionicons name="person" size={32} color="#5e8c61" />
                </View>
                <View style={styles.volunteerDetails}>
                  <Text style={styles.volunteerName}>Volunteer Assigned</Text>
                  <Text style={styles.volunteerSubtext}>Working on this issue</Text>
                </View>
              </View>
              <View style={styles.volunteerActions}>
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={handleCall}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call" size={20} color="#FFFFFF" />
                  <Text style={styles.callButtonText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.trackButton}
                  onPress={handleTrack}
                  activeOpacity={0.8}
                >
                  <Ionicons name="navigate" size={20} color="#5e8c61" />
                  <Text style={styles.trackButtonText}>Navigate</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Description */}
        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{report.description || 'No description provided'}</Text>
          <Text style={styles.reportedTime}>Reported {formatDate(report.createdAt)}</Text>
          {report.isUrgent && (
            <View style={styles.urgentBanner}>
              <Ionicons name="warning" size={20} color="#DC2626" />
              <Text style={styles.urgentText}>Urgent Issue</Text>
            </View>
          )}
        </View>

        {/* Resolution Details for Citizens */}
        {report.status === 'Resolved' && (
          <View style={styles.resolutionSection}>
            <Text style={styles.sectionTitle}>Resolution</Text>
            {report.resolvedImage ? (
              <View style={styles.resolutionImageCard}>
                <Image
                  source={{ uri: report.resolvedImage.startsWith('data:') ? report.resolvedImage : `data:image/jpeg;base64,${report.resolvedImage}` }}
                  style={styles.resolutionImage}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View style={styles.noImageBox}>
                <Ionicons name="images-outline" size={24} color="#999" />
                <Text style={styles.noImageText}>No after photo provided</Text>
              </View>
            )}
            {report.resolutionNotes ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>Volunteer Notes</Text>
                <Text style={styles.notesText}>{report.resolutionNotes}</Text>
              </View>
            ) : null}
            <Text style={styles.resolvedMeta}>
              Resolved {report.resolvedAt ? formatDate(report.resolvedAt) : 'recently'}
            </Text>
          </View>
        )}

        {/* Community Engagement */}
        <View style={styles.engagementSection}>
          <View style={styles.engagementRow}>
            <View style={styles.engagementItem}>
              <Ionicons name="heart" size={20} color="#DC2626" />
              <Text style={styles.engagementText}>{report.upvotes || 0} Upvotes</Text>
            </View>
            <View style={styles.engagementItem}>
              <Ionicons name="chatbubble" size={20} color="#5e8c61" />
              <Text style={styles.engagementText}>{report.comments?.length || 0} Comments</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Confirm Resolved Button - Only for report owners when status is In Progress */}
      {!confirmed && isOwner && report.status === 'In Progress' && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirmResolved}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#9ACD32', '#8BC34A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.confirmGradient}
            >
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.confirmButtonText}>Confirm Resolved</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Success State */}
      {confirmed && (
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={64} color="#5e8c61" />
            <Text style={styles.successText}>Issue Resolved!</Text>
            <Text style={styles.successSubtext}>Thank you for your contribution</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F8F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E7E9CE',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    flex: 1,
    textAlign: 'center',
  },
  moreButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  // Thumbnail Section
  thumbnailSection: {
    position: 'relative',
    height: 280,
    backgroundColor: '#000',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  thumbnailOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  issueTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  urgencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  urgencyText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  categoryPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusPill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  ownerBadge: {
    backgroundColor: '#C3D105',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: '#C3D105',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  ownerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#21230F',
    letterSpacing: 0.5,
  },
  // Timeline Section
  timelineSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    marginHorizontal: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineStep: {
    flex: 1,
    alignItems: 'center',
  },
  timelineIconContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#F3F4F6',
  },
  timelineIconActive: {
    backgroundColor: '#5e8c61',
    borderColor: '#FFFFFF',
  },
  timelineIconCurrent: {
    backgroundColor: '#C3D105',
    borderColor: '#FFFFFF',
    shadowColor: '#C3D105',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ scale: 1.1 }],
  },
  timelineLine: {
    position: 'absolute',
    left: '50%',
    top: 40,
    width: 60,
    height: 2,
    backgroundColor: '#E7E9CE',
    transform: [{ translateX: 30 }],
  },
  timelineLineActive: {
    backgroundColor: '#5e8c61',
  },
  timelineLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 2,
  },
  timelineLabelActive: {
    color: '#374151',
    fontWeight: '700',
  },
  timelineLabelCurrent: {
    color: '#C3D105',
    fontWeight: '800',
  },
  // Map Section
  mapSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    marginHorizontal: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  mapCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mapPlaceholder: {
    height: 180,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5e8c61',
    marginTop: 8,
  },
  mapInfo: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginLeft: 30,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  etaText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666666',
  },
  // Volunteer Section
  volunteerSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    marginHorizontal: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  volunteerCard: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  volunteerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  volunteerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    backgroundColor: '#E7F6E9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#5e8c61',
  },
  volunteerDetails: {
    flex: 1,
  },
  volunteerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 4,
  },
  volunteerSubtext: {
    fontSize: 13,
    color: '#666666',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  ratingCount: {
    fontSize: 12,
    color: '#999999',
  },
  volunteerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5e8c61',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#5e8c61',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  callButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  trackButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: '#5e8c61',
  },
  trackButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5e8c61',
    letterSpacing: 0.5,
  },
  // Description Section
  descriptionSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    marginHorizontal: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  // Resolution Section
  resolutionSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    marginHorizontal: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  resolutionImageCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  resolutionImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#F0F0F0',
  },
  notesBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
  },
  notesLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  noImageBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  noImageText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  resolvedMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#4B5563',
    marginBottom: 12,
  },
  reportedTime: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  urgentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    padding: 14,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  urgentText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: 0.3,
  },
  // Engagement Section
  engagementSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    marginHorizontal: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  engagementRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    minWidth: 120,
    justifyContent: 'center',
  },
  engagementText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  // Gallery Section
  gallerySection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginTop: 12,
  },
  galleryScroll: {
    marginHorizontal: -16,
  },
  galleryContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  galleryItem: {
    width: 160,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  bottomSpacer: {
    height: 20,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#5e8c61',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  // Success Overlay
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    marginHorizontal: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
  },
  successText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginTop: 20,
    marginBottom: 10,
  },
  successSubtext: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
});
