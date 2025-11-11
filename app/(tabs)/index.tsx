import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ImageBackground,
  ScrollView,
  Pressable,
  Dimensions,
  StatusBar,
  Modal,
  Animated,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { getSavedUser, User, clearUser } from '@/lib/auth';
import { useRouter } from 'expo-router';
import { getReports } from '@/lib/api';
import * as Location from 'expo-location';

const { height, width } = Dimensions.get('window');

// Auto-scroll carousel images
const CAROUSEL_IMAGES = [
  require('../../assets/images/scroll1.jpg'),
  require('../../assets/images/scroll2.jpg'),
  require('../../assets/images/scroll3.jpg'),
  require('../../assets/images/scroll4.jpg'),
  require('../../assets/images/scroll5.jpg'),
];

type Urgency = 'High Urgency' | 'Medium' | 'Low';

type Issue = {
  id: string;
  title: string;
  distance: string;
  urgency: Urgency;
  imageUri: string;
};

const ISSUES: Issue[] = [
  {
    id: '1',
    title: 'Illegal Dumping',
    distance: '0.5 miles away',
    urgency: 'High Urgency',
    imageUri:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCVcs3m6uMIoy4bp_cd74IUAoXVQhN9To6PF0R59CVouNFwYQmnTlvA8a4b3rrCM0rLRHPlBjiSrXDWkIsaW9GbGHVeadZ3SfYiNpfgWtlgldQpeguXLqP6al-L3i_zrt3wnMja_bmOEGB1t31Im5SP0fmREPrAvKh5eaonp1EVrTBX9yRO01cagQL6NcaALJVCftqQ4URbmDMr67BUXVDYWBe2kX67LGBkiusazg1ItLcjvcvH9zjjKZRHkl5-o4sowvfxveEAOqc',
  },
  {
    id: '2',
    title: 'River Pollution',
    distance: '1.2 miles away',
    urgency: 'Medium',
    imageUri:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDv-q5o2PuXxGEIjfug-2XEcB_MdjoAzzbyK-dLhtA92YjSo2NZSN1uTW3ObazhE62TiW-5pSQKMfgTz64iCVusIgGjDRuhw2bnIrOF15T8lzJ12_vZkqmb0W8lgWDpvTY2F4TEKUq9CR0wZ23OTkxvL5S1_kplAWshmxlQW69ulVHsu1gZLH92KZGP3BGY8T3-EZzQIH9o8eCrrYTgNcXIaTWIjIciYX6d1ICgsIvvLIrFMA7-ZqNyyOXCVxBA3i8s2H8oLZAatuk',
  },
  {
    id: '3',
    title: 'Tree Felling',
    distance: '2.1 miles away',
    urgency: 'Low',
    imageUri:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCSoK8y1soSc3tU-AwXq9dxRbk5jJq75mtoVdHisq_zU389kXKbs797Lyy51-VB-9pqnCkxxdouRa0_C7e2LJTwTpWK0OK8bFhB81e5Putp7hEr_SGZGiw9-EVHA0b5KlWbjOOEj5C-z_b3wsLVSGBWCwTsa8MLzH3XZIG7XHV6-RGBRusviVIsLyuj1z-bSXwAtXxy41NfA9mU6CsnbX-lLceBTiuOTTRg4BF0yAPeo9LdQxo-IYCjbYciOpO_BuVvM1-qt8xg5hU',
  },
];

const urgencyBadgeStyles: Record<
  Urgency,
  { bg: string; text: string }
> = {
  'High Urgency': { bg: '#FEE2E2', text: '#991B1B' },
  Medium: { bg: '#FFEDD5', text: '#9A3412' },
  Low: { bg: '#FEF3C7', text: '#92400E' },
};

function IssueCard({ issue }: { issue: Issue }) {
  const router = useRouter();
  const colors = urgencyBadgeStyles[issue.urgency];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${issue.title}, ${issue.distance}, ${issue.urgency}`}
      style={({ pressed }) => [
        styles.issueCard,
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
      onPress={() => router.push(`/report-detail?id=${issue.id}`)}
    >
      <Image
        source={{ uri: issue.imageUri }}
        style={styles.issueImage}
        resizeMode="cover"
      />
      <View style={styles.issueContent}>
        <Text style={styles.issueTitle}>{issue.title}</Text>
        <Text style={styles.issueDistance}>{issue.distance}</Text>
        <View style={[styles.urgencyBadge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.urgencyText, { color: colors.text }]}>
            {issue.urgency}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// Component for community reports (All Issues tab)
function ReportCard({ report }: { report: any }) {
  const router = useRouter();
  
  const severityColors: Record<string, { bg: string; text: string }> = {
    High: { bg: '#FEE2E2', text: '#991B1B' },
    Medium: { bg: '#FFEDD5', text: '#9A3412' },
    Low: { bg: '#FEF3C7', text: '#92400E' },
  };

  const statusColors: Record<string, string> = {
    Pending: '#FCD34D',
    'In Progress': '#60A5FA',
    Resolved: '#34D399',
    Rejected: '#F87171',
  };

  const severity = report.severity || 'Medium';
  const colors = severityColors[severity] || severityColors.Medium;
  const statusColor = statusColors[report.status] || statusColors.Pending;
  
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${report.category}, ${report.status}`}
      style={({ pressed }) => [
        styles.issueCard,
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
      onPress={() => router.push(`/report-detail?id=${report._id}`)}
    >
      {report.image ? (
        <Image
          source={{ 
            uri: report.image.startsWith('data:') 
              ? report.image 
              : `data:image/jpeg;base64,${report.image}` 
          }}
          style={styles.issueImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.issueImage, styles.imagePlaceholder]}>
          <Text style={styles.placeholderIcon}>📍</Text>
        </View>
      )}
      <View style={styles.issueContent}>
        <Text style={styles.issueTitle}>{report.category || 'Unknown'}</Text>
        <Text style={styles.issueDistance} numberOfLines={2}>
          {report.description || 'No description'}
        </Text>
        <View style={styles.reportMetaRow}>
          <View style={[styles.urgencyBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.urgencyText, { color: colors.text }]}>
              {severity}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>{report.status || 'Pending'}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// Enhanced component for user's own reports (My Reports tab) - shows resolution details
function MyReportCard({ report }: { report: any }) {
  const router = useRouter();
  
  const severityColors: Record<string, { bg: string; text: string }> = {
    High: { bg: '#FEE2E2', text: '#991B1B' },
    Medium: { bg: '#FFEDD5', text: '#9A3412' },
    Low: { bg: '#FEF3C7', text: '#92400E' },
  };

  const statusColors: Record<string, string> = {
    Pending: '#FCD34D',
    'In Progress': '#60A5FA',
    Resolved: '#34D399',
    Rejected: '#F87171',
  };

  const severity = report.severity || 'Medium';
  const colors = severityColors[severity] || severityColors.Medium;
  const statusColor = statusColors[report.status] || statusColors.Pending;
  const isResolved = report.status === 'Resolved';
  
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${report.category}, ${report.status}`}
      style={({ pressed }) => [
        styles.myReportCard,
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
      onPress={() => router.push(`/report-detail?id=${report._id}`)}
    >
      {/* Before Image */}
      <View style={styles.myReportImageSection}>
        <Text style={styles.myReportImageLabel}>Before</Text>
        {report.image ? (
          <Image
            source={{ 
              uri: report.image.startsWith('data:') 
                ? report.image 
                : `data:image/jpeg;base64,${report.image}` 
            }}
            style={styles.myReportImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.myReportImage, styles.imagePlaceholder]}>
            <Text style={styles.placeholderIcon}>📍</Text>
          </View>
        )}
      </View>

      {/* After Image (if resolved) */}
      {isResolved && report.resolvedImage && (
        <View style={styles.myReportImageSection}>
          <Text style={styles.myReportImageLabel}>After</Text>
          <Image
            source={{ 
              uri: report.resolvedImage.startsWith('data:') 
                ? report.resolvedImage 
                : `data:image/jpeg;base64,${report.resolvedImage}` 
            }}
            style={styles.myReportImage}
            resizeMode="cover"
          />
          <View style={styles.resolvedCheckmark}>
            <Text style={styles.checkmarkIcon}>✓</Text>
          </View>
        </View>
      )}

      {/* Report Details */}
      <View style={styles.myReportContent}>
        <View style={styles.myReportHeader}>
          <Text style={styles.myReportTitle}>{report.category || 'Unknown'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>{report.status || 'Pending'}</Text>
          </View>
        </View>
        
        <Text style={styles.myReportDescription} numberOfLines={2}>
          {report.description || 'No description'}
        </Text>

        <View style={styles.myReportMetaRow}>
          <View style={[styles.urgencyBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.urgencyText, { color: colors.text }]}>
              {severity}
            </Text>
          </View>
          <Text style={styles.myReportDate}>
            {new Date(report.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Resolution Notes */}
        {isResolved && report.resolutionNotes && (
          <View style={styles.resolutionNotesBox}>
            <Text style={styles.resolutionNotesLabel}>Volunteer Notes:</Text>
            <Text style={styles.resolutionNotesText} numberOfLines={2}>
              {report.resolutionNotes}
            </Text>
          </View>
        )}

        {/* Resolved Date */}
        {isResolved && report.resolvedAt && (
          <Text style={styles.resolvedDate}>
            ✓ Resolved on {new Date(report.resolvedAt).toLocaleDateString()}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useState(new Animated.Value(-300))[0];
  const fadeAnim = useState(new Animated.Value(0))[0];
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [myReports, setMyReports] = useState<any[]>([]);
  const [allReports, setAllReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>('Detecting location...');
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  
  // Auto-scroll carousel state
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadUser();
    loadAllReports();
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (user && (user.id || user._id)) {
      loadMyReports();
    }
  }, [user]);

  const loadUser = async () => {
    const savedUser = await getSavedUser();
    if (savedUser) {
      setUser(savedUser);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setCurrentLocation('Location access denied');
        setIsLoadingLocation(false);
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // Reverse geocode to get address
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        // Format location string - prioritize city/district, then region
        const locationString = address.city || address.district || address.subregion || address.region || 'Current Location';
        setCurrentLocation(locationString);
      } else {
        setCurrentLocation('Current Location');
      }
    } catch (error) {
      console.error('Location Error:', error);
      setCurrentLocation('Location unavailable');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const loadAllReports = async () => {
    try {
      setLoadingReports(true);
      console.log('📊 Loading ALL community reports (no filter)');
      // Get all reports from everyone in the community
      const reports = await getReports({ limit: 50 });
      console.log('📊 All community reports received:', reports?.length || 0);
      setAllReports(reports || []);
    } catch (error) {
      console.error('❌ Error loading all reports:', error);
      setAllReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  const loadMyReports = async () => {
    if (!user) return;
    // Use id or _id, whichever is available
    const userId = user.id || user._id;
    if (!userId) return;
    
    try {
      setLoadingReports(true);
      console.log('📊 Loading MY submitted reports for user ID:', userId);
      console.log('📊 User email:', user.email);
      
      // Get only reports submitted by this user
      const reports = await getReports({ userId: userId });
      console.log('📊 My submitted reports received:', reports?.length || 0);
      
      if (reports && reports.length > 0) {
        console.log('📊 Sample report details:', {
          category: reports[0].category,
          status: reports[0].status,
          hasResolution: !!reports[0].resolvedImage,
        });
      }
      
      setMyReports(reports || []);
    } catch (error) {
      console.error('❌ Error loading my reports:', error);
      setMyReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  const onRefresh = async () => {
    if (activeTab === 'all') {
      await loadAllReports();
    } else {
      await loadMyReports();
    }
  };

  // Auto-scroll carousel effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % CAROUSEL_IMAGES.length;
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, 4000); // Slower transition - 4 seconds for smoother feel

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (menuVisible) {
      // Smooth slide in with fade
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          friction: 10,
          tension: 50,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Smooth slide out with fade
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -300,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [menuVisible]);

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.name) return 'U';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.name[0].toUpperCase();
  };

  // Navigate to profile tab
  const handleProfilePress = () => {
    router.push('/explore');
  };

  // Toggle menu
  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  // Handle logout
  const handleLogout = async () => {
    await clearUser();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Map Section */}
      <View style={[styles.mapSection, { paddingTop: insets.top }]}>
        <ImageBackground
          source={require('../../assets/images/map.jpg')}
          style={styles.mapBackground}
          resizeMode="cover"
        >
          {/* Bottom fade to blend into sheet */}
          <LinearGradient
            colors={['transparent', 'rgba(233,236,231,0.8)', '#E9ECE7']}
            locations={[0, 0.7, 1]}
            style={styles.mapFade}
          />

          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.topBarContent}>
              <Pressable 
                style={styles.menuButton} 
                accessibilityRole="button" 
                accessibilityLabel="Menu"
                onPress={toggleMenu}
              >
                <View style={styles.menuLine} />
                <View style={styles.menuLine} />
                <View style={styles.menuLine} />
              </Pressable>

              <Pressable 
                style={styles.locationPill}
                onPress={getCurrentLocation}
                accessibilityRole="button"
                accessibilityLabel="Refresh location"
              >
                <View style={styles.locationIcon}>
                  <View style={styles.locationPin} />
                </View>
                <Text style={styles.locationText} numberOfLines={1}>
                  {isLoadingLocation ? 'Locating...' : currentLocation}
                </Text>
              </Pressable>

              <Pressable 
                style={({ pressed }) => [
                  styles.avatarButton,
                  pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }
                ]}
                accessibilityRole="button" 
                accessibilityLabel="Open Profile"
                onPress={handleProfilePress}
              >
                <View style={styles.userAvatar}>
                  <Text style={styles.userInitials}>{getUserInitials()}</Text>
                </View>
                {user && (
                  <View style={styles.userBadge}>
                    <Text style={styles.userBadgeText}>●</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>

          {/* Auto-scrolling Carousel */}
          <View style={styles.carouselContainer}>
            <FlatList
              ref={flatListRef}
              data={CAROUSEL_IMAGES}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, index) => index.toString()}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: false }
              )}
              scrollEventThrottle={16}
              decelerationRate="fast"
              snapToInterval={width}
              snapToAlignment="center"
              onScrollToIndexFailed={(info) => {
                setTimeout(() => {
                  flatListRef.current?.scrollToIndex({
                    index: info.index,
                    animated: true,
                  });
                }, 100);
              }}
              renderItem={({ item, index }) => (
                <View style={styles.carouselItem}>
                  <Image
                    source={item}
                    style={styles.carouselImage}
                    resizeMode="cover"
                  />
                  {/* Blur overlay for depth effect */}
                  <BlurView intensity={60} tint="default" style={styles.carouselBlurOverlay} />
                </View>
              )}
            />
            
            {/* Pagination Dots */}
            <View style={styles.paginationContainer}>
              {CAROUSEL_IMAGES.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    currentIndex === index && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Map Pins */}
          <View style={[styles.pinContainer, { top: '35%', left: '25%' }]}>
            <View style={styles.mapPin}>
              <View style={styles.pinTop} />
              <View style={styles.pinBottom} />
            </View>
          </View>
          <View style={[styles.pinContainer, { top: '25%', left: '50%' }]}>
            <View style={[styles.mapPin, styles.mapPinLarge]}>
              <View style={styles.pinTop} />
              <View style={styles.pinBottom} />
            </View>
          </View>
          <View style={[styles.pinContainer, { top: '35%', left: '75%' }]}>
            <View style={styles.mapPin}>
              <View style={styles.pinTop} />
              <View style={styles.pinBottom} />
            </View>
          </View>
        </ImageBackground>
      </View>

      {/* Bottom sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tab, activeTab === 'all' && styles.tabActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              All Issues
            </Text>
            {allReports.length > 0 && (
              <View style={[styles.tabBadge, activeTab === 'all' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'all' && styles.tabBadgeTextActive]}>
                  {allReports.length}
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'my' && styles.tabActive]}
            onPress={() => setActiveTab('my')}
          >
            <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>
              My Reports
            </Text>
            {myReports.length > 0 && (
              <View style={[styles.tabBadge, activeTab === 'my' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'my' && styles.tabBadgeTextActive]}>
                  {myReports.length}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 110 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loadingReports} onRefresh={onRefresh} colors={['#5e8c61']} />
          }
        >
          {loadingReports && (allReports.length === 0 && myReports.length === 0) ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#5e8c61" />
              <Text style={styles.loadingText}>Loading reports...</Text>
            </View>
          ) : activeTab === 'all' ? (
            Array.isArray(allReports) && allReports.length > 0 ? (
              allReports.map((report) => (
                <ReportCard key={report._id} report={report} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🌍</Text>
                <Text style={styles.emptyText}>No community reports</Text>
                <Text style={styles.emptySubtext}>
                  Be the first to report an environmental issue
                </Text>
              </View>
            )
          ) : (
            Array.isArray(myReports) && myReports.length > 0 ? (
              myReports.map((report) => (
                <MyReportCard key={report._id} report={report} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={styles.emptyText}>No reports yet</Text>
                <Text style={styles.emptySubtext}>
                  Start making a difference by reporting environmental issues in your area
                </Text>
                <Pressable
                  style={styles.emptyButton}
                  onPress={() => router.push('/report-issue')}
                >
                  <Text style={styles.emptyButtonText}>+ Report an Issue</Text>
                </Pressable>
              </View>
            )
          )}
        </ScrollView>
      </View>

      {/* Floating action button with integrated glow */}
      <View
        style={[
          styles.fabContainer,
          {
            bottom: Math.max(insets.bottom + 4, 8),
          },
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Report an issue"
          android_ripple={{ color: 'rgba(0,0,0,0.12)', borderless: false }}
          onPress={() => router.push('/report-issue')}
          style={({ pressed }) => [
            styles.fab,
            pressed && { transform: [{ scale: 0.94 }], opacity: 0.9 },
          ]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          {/* Background glow layer */}
          <View style={styles.fabGlowBackground}>
            <View style={styles.fabGlowInner} />
          </View>
          
          {/* Main button gradient */}
          <LinearGradient
            colors={["#9ACD32", "#8BC34A"]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={styles.fabGradient}
          >
            <View style={styles.fabHighlight} />
            <Text style={styles.fabIcon}>+</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Sidebar Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Animated.View 
          style={[
            styles.modalOverlay,
            { opacity: fadeAnim }
          ]}
        >
          <Pressable 
            style={{ flex: 1 }}
            onPress={() => setMenuVisible(false)}
          >
            <Animated.View 
              style={[
                styles.sidebarMenu,
                { 
                  transform: [{ translateX: slideAnim }],
                  paddingTop: insets.top + 16,
                  paddingBottom: insets.bottom + 16,
                }
              ]}
            >
              <Pressable onPress={(e) => e.stopPropagation()}>
              {/* Header */}
              <View style={styles.menuHeader}>
                <View style={styles.menuAvatar}>
                  <Text style={styles.menuAvatarText}>{getUserInitials()}</Text>
                </View>
                <View style={styles.menuUserInfo}>
                  <Text style={styles.menuUserName}>{user?.name || 'User'}</Text>
                  <Text style={styles.menuUserRole}>
                    {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Citizen'}
                  </Text>
                </View>
              </View>

              {/* Menu Items */}
              <View style={styles.menuItems}>
                <Pressable style={styles.menuItem} onPress={() => { setMenuVisible(false); }}>
                  <Text style={styles.menuItemIcon}>🏠</Text>
                  <Text style={styles.menuItemText}>Home</Text>
                </Pressable>

                <Pressable style={styles.menuItem} onPress={() => { setMenuVisible(false); }}>
                  <Text style={styles.menuItemIcon}>📍</Text>
                  <Text style={styles.menuItemText}>My Reports</Text>
                </Pressable>

                <Pressable style={styles.menuItem} onPress={() => { setMenuVisible(false); }}>
                  <Text style={styles.menuItemIcon}>⭐</Text>
                  <Text style={styles.menuItemText}>Saved Issues</Text>
                </Pressable>

                <Pressable style={styles.menuItem} onPress={() => { setMenuVisible(false); }}>
                  <Text style={styles.menuItemIcon}>📊</Text>
                  <Text style={styles.menuItemText}>Statistics</Text>
                </Pressable>

                <Pressable style={styles.menuItem} onPress={() => { setMenuVisible(false); }}>
                  <Text style={styles.menuItemIcon}>🔔</Text>
                  <Text style={styles.menuItemText}>Notifications</Text>
                </Pressable>

                <View style={styles.menuDivider} />

                <Pressable style={styles.menuItem} onPress={() => { setMenuVisible(false); handleProfilePress(); }}>
                  <Text style={styles.menuItemIcon}>⚙️</Text>
                  <Text style={styles.menuItemText}>Settings</Text>
                </Pressable>

                <Pressable style={styles.menuItem} onPress={() => { setMenuVisible(false); }}>
                  <Text style={styles.menuItemIcon}>❓</Text>
                  <Text style={styles.menuItemText}>Help & Support</Text>
                </Pressable>

                <Pressable style={styles.menuItem} onPress={() => { setMenuVisible(false); }}>
                  <Text style={styles.menuItemIcon}>ℹ️</Text>
                  <Text style={styles.menuItemText}>About EcoBandhu</Text>
                </Pressable>

                <View style={styles.menuDivider} />

                <Pressable 
                  style={[styles.menuItem, styles.menuItemLogout]} 
                  onPress={() => { setMenuVisible(false); handleLogout(); }}
                >
                  <Text style={styles.menuItemIcon}>🚪</Text>
                  <Text style={[styles.menuItemText, styles.menuItemLogoutText]}>Logout</Text>
                </Pressable>
              </View>

              {/* Footer */}
              <View style={styles.menuFooter}>
                <Text style={styles.menuVersion}>EcoBandhu v1.0.0</Text>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E9ECE7', // Beige from screenshot
  },
  // Map Section
  mapSection: {
    height: height * 0.5,
  },
  mapBackground: {
    flex: 1,
    width: '100%',
  },
  mapFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '30%',
  },
  // Top Bar
  topBar: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    height: 56,
    backgroundColor: 'rgba(233, 236, 231, 0.85)', // Beige with transparency
    borderRadius: 28,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  menuLine: {
    width: 20,
    height: 2,
    backgroundColor: '#1F2937',
    borderRadius: 1,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D5DB8F', // Yellow-green from screenshot
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 6,
    maxWidth: '60%',
  },
  locationIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPin: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D5DB8F',
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flexShrink: 1,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    position: 'relative',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#9ACD32',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  userInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userBadgeText: {
    fontSize: 10,
    color: '#10B981',
    lineHeight: 10,
  },
  avatar: {
    width: 40,
    height: 40,
  },
  // Auto-scroll Carousel
  carouselContainer: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    height: 180,
    zIndex: 1,
  },
  carouselItem: {
    width: width * 0.88,
    marginHorizontal: width * 0.06,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    backgroundColor: '#000',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  carouselBlurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    opacity: 0.15,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 28,
    shadowOpacity: 0.5,
  },
  // Map Pins
  pinContainer: {
    position: 'absolute',
  },
  mapPin: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#D4A443', // Golden yellow from screenshot
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  mapPinLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  pinTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '50%',
    backgroundColor: '#D4A443',
  },
  pinBottom: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 12,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#D4A443',
  },
  // Bottom sheet
  bottomSheet: {
    flex: 1,
    backgroundColor: '#E9ECE7', // Beige background from screenshot
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 2,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  scrollView: {
    flex: 1,
  },
  issueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  // My Reports Card - Enhanced with before/after images
  myReportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  myReportImageSection: {
    position: 'relative',
    marginBottom: 12,
  },
  myReportImageLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  myReportImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  resolvedCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#34D399',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#34D399',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  checkmarkIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  myReportContent: {
    gap: 8,
  },
  myReportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  myReportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  myReportDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  myReportMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  myReportDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  resolutionNotesBox: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 3,
    borderLeftColor: '#34D399',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  resolutionNotesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resolutionNotesText: {
    fontSize: 13,
    color: '#065F46',
    lineHeight: 18,
  },
  resolvedDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginTop: 4,
  },
  issueImage: {
    width: 100, // 100px circular images from screenshot
    height: 100,
    borderRadius: 50, // Fully circular
    backgroundColor: '#E5E7EB',
  },
  issueContent: {
    flex: 1,
    marginLeft: 16,
    gap: 4,
  },
  issueTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  issueDistance: {
    fontSize: 13,
    color: '#6B7280',
  },
  urgencyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 4,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  placeholderIcon: {
    fontSize: 32,
  },
  reportMetaRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#5e8c61',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    minWidth: 24,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333333',
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: '#5e8c61',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: '#5e8c61',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // FAB
  fabContainer: {
    position: 'absolute',
    alignSelf: 'center', // Center horizontally
  },
  fab: {
    width: 66,
    height: 66,
    borderRadius: 33,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  fabGlowBackground: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(154,205,50,0.25)',
    top: -17,
    left: -17,
    zIndex: -1,
  },
  fabGlowInner: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(154,205,50,0.15)',
    top: 10,
    left: 10,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  fabHighlight: {
    position: 'absolute',
    left: 3,
    right: 3,
    top: 3,
    bottom: 3,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  fabIcon: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginTop: -2,
  },
  // Sidebar Menu
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebarMenu: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: '#F8F8F5',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E4E7',
    backgroundColor: '#FFFFFF',
  },
  menuAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#C3D105',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  menuUserInfo: {
    flex: 1,
  },
  menuUserName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#18181B',
    marginBottom: 2,
  },
  menuUserRole: {
    fontSize: 13,
    color: '#71717A',
    textTransform: 'capitalize',
  },
  menuItems: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 28,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#18181B',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E4E4E7',
    marginVertical: 8,
    marginHorizontal: 20,
  },
  menuItemLogout: {
    marginTop: 4,
  },
  menuItemLogoutText: {
    color: '#DC2626',
  },
  menuFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E4E4E7',
    alignItems: 'center',
  },
  menuVersion: {
    fontSize: 12,
    color: '#A1A1AA',
  },
});
