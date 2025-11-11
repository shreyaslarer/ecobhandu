import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getReports, getReportsStats, updateReportStatus, Report } from '@/lib/api';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isDesktop = isWeb && width >= 1024;

type FilterType = 'all' | 'escalated' | 'open' | 'closed';
type ViewMode = 'list' | 'map';

interface KPIData {
  openIssues: number;
  resolvedToday: number;
  avgResponseTime: string;
  totalReports: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState<'dashboard' | 'reports' | 'volunteers' | 'zones' | 'rewards'>('dashboard');
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [kpiData, setKpiData] = useState<KPIData>({
    openIssues: 0,
    resolvedToday: 0,
    avgResponseTime: '0h',
    totalReports: 0,
  });
  const [showExportModal, setShowExportModal] = useState(false);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningReport, setAssigningReport] = useState<Report | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadDashboardData();
    
    // Set up auto-refresh every 10 seconds for real-time updates
    const refreshInterval = setInterval(() => {
      loadDashboardData();
    }, 10000);

    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [reports, filterType, searchQuery, dateFilter]);

  // Auto-select first report when filtered list changes
  useEffect(() => {
    if (filteredReports.length > 0 && !selectedReport) {
      setSelectedReport(filteredReports[0]);
    }
  }, [filteredReports]);

  const loadDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const [reportsData, statsData] = await Promise.all([
        getReports({ limit: 200 }),
        getReportsStats(),
      ]);

      setReports(reportsData || []);
      calculateKPIs(reportsData || []);
      setLastUpdate(new Date());
      
      // Pulse animation on update
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Update selected report if it exists in new data
      if (selectedReport) {
        const updatedReport = reportsData?.find(r => r._id === selectedReport._id);
        if (updatedReport) {
          setSelectedReport(updatedReport);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData(true);
    setIsRefreshing(false);
  };

  const calculateKPIs = (reportsData: Report[]) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const openIssues = reportsData.filter(r => r.status === 'Pending' || r.status === 'In Progress').length;
    const resolvedToday = reportsData.filter(r => {
      if (r.status !== 'Resolved' || !r.resolvedAt) return false;
      return new Date(r.resolvedAt) >= todayStart;
    }).length;

    // Calculate average response time
    const resolvedReports = reportsData.filter(r => r.status === 'Resolved' && r.resolvedAt);
    let avgHours = 0;
    if (resolvedReports.length > 0) {
      const totalHours = resolvedReports.reduce((sum, r) => {
        const created = new Date(r.createdAt).getTime();
        const resolved = new Date(r.resolvedAt!).getTime();
        return sum + (resolved - created) / (1000 * 60 * 60);
      }, 0);
      avgHours = Math.round(totalHours / resolvedReports.length);
    }

    setKpiData({
      openIssues,
      resolvedToday,
      avgResponseTime: `${avgHours}h`,
      totalReports: reportsData.length,
    });
  };

  const applyFilters = () => {
    let filtered = [...reports];

    // Filter by type
    switch (filterType) {
      case 'escalated':
        filtered = filtered.filter(r => r.isUrgent || r.severity === 'Critical');
        break;
      case 'open':
        filtered = filtered.filter(r => r.status === 'Pending' || r.status === 'In Progress');
        break;
      case 'closed':
        filtered = filtered.filter(r => r.status === 'Resolved' || r.status === 'Rejected');
        break;
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      filtered = filtered.filter(r => new Date(r.createdAt) >= filterDate);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.description.toLowerCase().includes(query) ||
        r.category.toLowerCase().includes(query) ||
        r.location.toLowerCase().includes(query)
      );
    }

    setFilteredReports(filtered);
  };

  const handleExportCSV = () => {
    const csvData = filteredReports.map(r => ({
      ID: r._id,
      Category: r.category,
      Description: r.description,
      Location: r.location,
      Severity: r.severity,
      Status: r.status,
      Created: new Date(r.createdAt).toLocaleString(),
      Resolved: r.resolvedAt ? new Date(r.resolvedAt).toLocaleString() : 'N/A',
    }));

    const headers = Object.keys(csvData[0] || {}).join(',');
    const rows = csvData.map(row => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;

    // For web, trigger download
    if (isWeb) {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ecobhandu-reports-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }

    setShowExportModal(false);
  };

  const handleEscalate = async (reportId: string) => {
    try {
      Alert.alert(
        'Escalate Report',
        'Mark this report as high priority?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Escalate',
            style: 'destructive',
            onPress: async () => {
              await updateReportStatus(reportId, 'Pending');
              await loadDashboardData(true);
              Alert.alert('Success', 'Report has been escalated');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error escalating report:', error);
      Alert.alert('Error', 'Failed to escalate report');
    }
  };

  const handleAssignReport = (report: Report) => {
    setAssigningReport(report);
    setShowAssignModal(true);
  };

  const confirmAssign = async () => {
    if (!assigningReport) return;
    
    try {
      // In a real app, you'd select a volunteer here
      await updateReportStatus(assigningReport._id, 'In Progress');
      await loadDashboardData(true);
      setShowAssignModal(false);
      setAssigningReport(null);
      Alert.alert('Success', 'Report assigned to volunteer');
    } catch (error) {
      console.error('Error assigning report:', error);
      Alert.alert('Error', 'Failed to assign report');
    }
  };

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    try {
      await updateReportStatus(reportId, newStatus);
      await loadDashboardData(true);
      Alert.alert('Success', `Status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  // Render functions
  const renderLeftNav = () => (
    <View style={styles.leftNav}>
      <View style={styles.navHeader}>
        <Text style={styles.orgName}>EcoBhandu Admin</Text>
        <Text style={styles.orgSubtitle}>Authority Dashboard</Text>
      </View>

      <View style={styles.navItems}>
        {[
          { id: 'dashboard', icon: 'chart.bar.fill', label: 'Dashboard' },
          { id: 'reports', icon: 'doc.text.fill', label: 'Reports' },
          { id: 'volunteers', icon: 'person.2.fill', label: 'Volunteers' },
          { id: 'zones', icon: 'map.fill', label: 'Zones' },
          { id: 'rewards', icon: 'star.fill', label: 'Rewards' },
        ].map((item) => (
          <Pressable
            key={item.id}
            style={[styles.navItem, activeNav === item.id && styles.navItemActive]}
            onPress={() => setActiveNav(item.id as any)}
          >
            <IconSymbol
              name={item.icon as any}
              size={20}
              color={activeNav === item.id ? '#4CAF50' : '#607D8B'}
            />
            <Text style={[styles.navItemText, activeNav === item.id && styles.navItemTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.navFooter}>
        <Pressable style={styles.logoutButton} onPress={() => router.back()}>
          <IconSymbol name="arrow.left.circle" size={20} color="#607D8B" />
          <Text style={styles.logoutText}>Exit Admin</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderKPICards = () => (
    <View style={styles.kpiRow}>
      <Pressable style={[styles.kpiCard, { backgroundColor: '#FFF3E0' }]}>
        <IconSymbol name="exclamationmark.triangle.fill" size={24} color="#FF9800" />
        <Animated.Text style={[styles.kpiValue, { transform: [{ scale: pulseAnim }] }]}>
          {kpiData.openIssues}
        </Animated.Text>
        <Text style={styles.kpiLabel}>Open Issues</Text>
        <View style={[styles.trendIndicator, kpiData.openIssues > 20 && styles.trendUp]}>
          <Text style={styles.trendText}>
            {kpiData.openIssues > 20 ? '↑ High' : '✓ Normal'}
          </Text>
        </View>
      </Pressable>

      <Pressable style={[styles.kpiCard, { backgroundColor: '#E8F5E9' }]}>
        <IconSymbol name="checkmark.circle.fill" size={24} color="#4CAF50" />
        <Animated.Text style={[styles.kpiValue, { transform: [{ scale: pulseAnim }] }]}>
          {kpiData.resolvedToday}
        </Animated.Text>
        <Text style={styles.kpiLabel}>Resolved Today</Text>
        <View style={styles.trendIndicator}>
          <Text style={styles.trendText}>
            {kpiData.resolvedToday > 0 ? `+${kpiData.resolvedToday}` : '—'}
          </Text>
        </View>
      </Pressable>

      <Pressable style={[styles.kpiCard, { backgroundColor: '#E3F2FD' }]}>
        <IconSymbol name="clock.fill" size={24} color="#2196F3" />
        <Animated.Text style={[styles.kpiValue, { transform: [{ scale: pulseAnim }] }]}>
          {kpiData.avgResponseTime}
        </Animated.Text>
        <Text style={styles.kpiLabel}>Avg Response</Text>
        <View style={styles.trendIndicator}>
          <Text style={styles.trendText}>Target: 24h</Text>
        </View>
      </Pressable>

      <Pressable style={[styles.kpiCard, { backgroundColor: '#F3E5F5' }]}>
        <IconSymbol name="chart.bar.fill" size={24} color="#9C27B0" />
        <Animated.Text style={[styles.kpiValue, { transform: [{ scale: pulseAnim }] }]}>
          {kpiData.totalReports}
        </Animated.Text>
        <Text style={styles.kpiLabel}>Total Reports</Text>
        <View style={styles.trendIndicator}>
          <Text style={styles.trendText}>All Time</Text>
        </View>
      </Pressable>
    </View>
  );

  const renderTopBar = () => (
    <View style={styles.topBar}>
      <View style={styles.topBarLeft}>
        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>Reports Dashboard</Text>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </Animated.View>
        </View>
        <View style={styles.dateFilterRow}>
          {['today', 'week', 'month', 'all'].map((filter) => (
            <Pressable
              key={filter}
              style={[styles.dateFilterChip, dateFilter === filter && styles.dateFilterChipActive]}
              onPress={() => setDateFilter(filter as any)}
            >
              <Text style={[styles.dateFilterText, dateFilter === filter && styles.dateFilterTextActive]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.lastUpdateText}>
          Last updated: {lastUpdate.toLocaleTimeString()}
        </Text>
      </View>

      <View style={styles.topBarRight}>
        <Pressable 
          style={[styles.refreshButton, isRefreshing && styles.refreshButtonActive]} 
          onPress={handleManualRefresh}
          disabled={isRefreshing}
        >
          <IconSymbol name="arrow.clockwise" size={20} color="#4CAF50" />
          <Text style={styles.refreshButtonText}>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Text>
        </Pressable>

        <Pressable style={styles.viewToggle} onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}>
          <IconSymbol name={viewMode === 'list' ? 'map.fill' : 'list.bullet'} size={20} color="#4CAF50" />
          <Text style={styles.viewToggleText}>{viewMode === 'list' ? 'Map View' : 'List View'}</Text>
        </Pressable>

        <Pressable style={styles.exportButton} onPress={() => setShowExportModal(true)}>
          <IconSymbol name="square.and.arrow.down.fill" size={20} color="#FFFFFF" />
          <Text style={styles.exportButtonText}>Export CSV</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersRow}>
      <View style={styles.searchBox}>
        <IconSymbol name="magnifyingglass" size={18} color="#9E9E9E" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search reports..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9E9E9E"
        />
      </View>

      <View style={styles.filterChips}>
        {[
          { id: 'all', label: 'All', count: reports.length },
          { id: 'escalated', label: 'Escalated', count: reports.filter(r => r.isUrgent || r.severity === 'Critical').length },
          { id: 'open', label: 'Open', count: reports.filter(r => r.status === 'Pending' || r.status === 'In Progress').length },
          { id: 'closed', label: 'Closed', count: reports.filter(r => r.status === 'Resolved' || r.status === 'Rejected').length },
        ].map((filter) => (
          <Pressable
            key={filter.id}
            style={[styles.filterChip, filterType === filter.id && styles.filterChipActive]}
            onPress={() => setFilterType(filter.id as FilterType)}
          >
            <Text style={[styles.filterChipText, filterType === filter.id && styles.filterChipTextActive]}>
              {filter.label}
            </Text>
            <View style={[styles.filterBadge, filterType === filter.id && styles.filterBadgeActive]}>
              <Text style={[styles.filterBadgeText, filterType === filter.id && styles.filterBadgeTextActive]}>
                {filter.count}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderReportsList = () => (
    <ScrollView style={styles.reportsList} showsVerticalScrollIndicator={false}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      ) : filteredReports.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="tray.fill" size={64} color="#BDBDBD" />
          <Text style={styles.emptyText}>No reports found</Text>
          <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
        </View>
      ) : (
        filteredReports.map((report) => (
          <Pressable
            key={report._id}
            style={[styles.reportCard, selectedReport?._id === report._id && styles.reportCardActive]}
            onPress={() => setSelectedReport(report)}
          >
            <View style={styles.reportCardHeader}>
              <View style={styles.reportCardLeft}>
                <Text style={styles.reportCategory}>{report.category}</Text>
                <Text style={styles.reportDescription} numberOfLines={2}>
                  {report.description}
                </Text>
                <Text style={styles.reportLocation}>
                  <IconSymbol name="mappin" size={12} color="#607D8B" /> {report.location}
                </Text>
              </View>

              <View style={styles.reportCardRight}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
                  <Text style={styles.statusBadgeText}>{report.status}</Text>
                </View>
                <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(report.severity) }]}>
                  <Text style={styles.severityBadgeText}>{report.severity}</Text>
                </View>
                {report.isUrgent && (
                  <View style={styles.urgentFlag}>
                    <IconSymbol name="exclamationmark.triangle.fill" size={14} color="#FF5252" />
                    <Text style={styles.urgentText}>URGENT</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.reportCardFooter}>
              <Text style={styles.reportDate}>
                {new Date(report.createdAt).toLocaleDateString()} • {new Date(report.createdAt).toLocaleTimeString()}
              </Text>
              <Text style={styles.reportId}>ID: {report._id.slice(-8)}</Text>
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );

  const renderDetailPanel = () => {
    if (!selectedReport) {
      return (
        <View style={styles.detailPanel}>
          <View style={styles.detailEmpty}>
            <IconSymbol name="doc.text" size={64} color="#BDBDBD" />
            <Text style={styles.detailEmptyText}>Select a report to view details</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.detailPanel}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>{selectedReport.category}</Text>
            <Pressable onPress={() => setSelectedReport(null)}>
              <IconSymbol name="xmark.circle.fill" size={24} color="#9E9E9E" />
            </Pressable>
          </View>

          {/* Map Preview */}
          <View style={styles.mapPreview}>
            <IconSymbol name="map.fill" size={48} color="#4CAF50" />
            <Text style={styles.mapPreviewText}>
              {selectedReport.coordinates.latitude.toFixed(6)}, {selectedReport.coordinates.longitude.toFixed(6)}
            </Text>
          </View>

          {/* Report Details */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Description</Text>
            <Text style={styles.detailText}>{selectedReport.description}</Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Location</Text>
            <Text style={styles.detailText}>{selectedReport.location}</Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Reporter</Text>
            <Text style={styles.detailText}>{selectedReport.userName}</Text>
            <Text style={styles.detailSubtext}>{selectedReport.userEmail}</Text>
          </View>

          {/* Timeline */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Timeline</Text>
            <View style={styles.timeline}>
              <View style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>Reported</Text>
                  <Text style={styles.timelineDate}>{new Date(selectedReport.createdAt).toLocaleString()}</Text>
                </View>
              </View>

              {selectedReport.assignedTo && (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: '#2196F3' }]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineLabel}>Assigned</Text>
                    <Text style={styles.timelineDate}>{new Date(selectedReport.updatedAt).toLocaleString()}</Text>
                  </View>
                </View>
              )}

              {selectedReport.status === 'Resolved' && selectedReport.resolvedAt && (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: '#4CAF50' }]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineLabel}>Resolved</Text>
                    <Text style={styles.timelineDate}>{new Date(selectedReport.resolvedAt).toLocaleString()}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Status Change */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Change Status</Text>
            <View style={styles.statusButtons}>
              {['Pending', 'In Progress', 'Resolved', 'Rejected'].map((status) => (
                <Pressable
                  key={status}
                  style={[
                    styles.statusButton,
                    selectedReport.status === status && styles.statusButtonActive,
                    { borderColor: getStatusColor(status) }
                  ]}
                  onPress={() => handleStatusChange(selectedReport._id, status)}
                >
                  <Text style={[
                    styles.statusButtonText,
                    selectedReport.status === status && { color: getStatusColor(status) }
                  ]}>
                    {status}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Pressable
              style={[styles.actionButton, styles.escalateButton]}
              onPress={() => handleEscalate(selectedReport._id)}
            >
              <IconSymbol name="exclamationmark.triangle.fill" size={18} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Escalate</Text>
            </Pressable>

            <Pressable 
              style={[styles.actionButton, styles.assignButton]}
              onPress={() => handleAssignReport(selectedReport)}
            >
              <IconSymbol name="person.badge.plus" size={18} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Assign Volunteer</Text>
            </Pressable>

            <Pressable style={[styles.actionButton, styles.exportSingleButton]}>
              <IconSymbol name="square.and.arrow.up" size={18} color="#4CAF50" />
              <Text style={[styles.actionButtonText, { color: '#4CAF50' }]}>Export Details</Text>
            </Pressable>
          </View>

          {/* Quick Stats */}
          <View style={styles.quickStats}>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{selectedReport.upvotes || 0}</Text>
              <Text style={styles.quickStatLabel}>Upvotes</Text>
            </View>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{selectedReport.comments?.length || 0}</Text>
              <Text style={styles.quickStatLabel}>Comments</Text>
            </View>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>
                {Math.round((new Date().getTime() - new Date(selectedReport.createdAt).getTime()) / (1000 * 60 * 60))}h
              </Text>
              <Text style={styles.quickStatLabel}>Age</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return '#FCD34D';
      case 'In Progress': return '#60A5FA';
      case 'Resolved': return '#34D399';
      case 'Rejected': return '#F87171';
      default: return '#9E9E9E';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return '#FF5252';
      case 'Major': return '#FF9800';
      case 'Minor': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  // Main render
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {isDesktop ? (
        <View style={styles.desktopLayout}>
          {/* Left Navigation */}
          {renderLeftNav()}

          {/* Middle Content */}
          <View style={styles.middleContent}>
            {renderTopBar()}
            {renderKPICards()}
            {renderFilters()}
            {renderReportsList()}
          </View>

          {/* Right Detail Panel */}
          {renderDetailPanel()}
        </View>
      ) : (
        <ScrollView style={styles.mobileLayout}>
          <Text style={styles.mobileWarning}>
            ⚠️ Admin Dashboard is optimized for desktop/web. Please use a larger screen for the best experience.
          </Text>
          {renderKPICards()}
          {renderFilters()}
          {renderReportsList()}
        </ScrollView>
      )}

      {/* Export Modal */}
      <Modal visible={showExportModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Export Reports</Text>
            <Text style={styles.modalText}>
              Export {filteredReports.length} reports to CSV format?
            </Text>
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancelButton} onPress={() => setShowExportModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalConfirmButton} onPress={handleExportCSV}>
                <Text style={styles.modalConfirmText}>Export</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign Modal */}
      <Modal visible={showAssignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign to Volunteer</Text>
            <Text style={styles.modalText}>
              Assign "{assigningReport?.category}" to a volunteer?
            </Text>
            <View style={styles.volunteerList}>
              <Text style={styles.volunteerNote}>
                This will mark the report as "In Progress" and notify available volunteers.
              </Text>
            </View>
            <View style={styles.modalButtons}>
              <Pressable 
                style={styles.modalCancelButton} 
                onPress={() => {
                  setShowAssignModal(false);
                  setAssigningReport(null);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalConfirmButton} onPress={confirmAssign}>
                <Text style={styles.modalConfirmText}>Assign</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  desktopLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  mobileLayout: {
    flex: 1,
    padding: 16,
  },
  mobileWarning: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    color: '#E65100',
    fontSize: 14,
    fontWeight: '600',
  },

  // Left Navigation
  leftNav: {
    width: 240,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    padding: 20,
  },
  navHeader: {
    marginBottom: 32,
  },
  orgName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 4,
  },
  orgSubtitle: {
    fontSize: 13,
    color: '#607D8B',
  },
  navItems: {
    flex: 1,
    gap: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: '#E8F5E9',
  },
  navItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#607D8B',
  },
  navItemTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  navFooter: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  logoutText: {
    fontSize: 14,
    color: '#607D8B',
  },

  // Middle Content
  middleContent: {
    flex: 1,
    padding: 24,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  topBarLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4CAF50',
    letterSpacing: 0.5,
  },
  lastUpdateText: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 4,
  },
  dateFilterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  dateFilterChipActive: {
    backgroundColor: '#C3D105',
  },
  dateFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#607D8B',
  },
  dateFilterTextActive: {
    color: '#000000',
  },
  topBarRight: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  refreshButtonActive: {
    opacity: 0.6,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  viewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // KPI Cards
  kpiRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  kpiCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#333333',
    marginTop: 8,
  },
  kpiLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#607D8B',
    marginTop: 4,
  },
  trendIndicator: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  trendUp: {
    backgroundColor: 'rgba(255,152,0,0.1)',
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#607D8B',
  },

  // Filters
  filtersRow: {
    marginBottom: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333333',
  },
  filterChips: {
    flexDirection: 'row',
    gap: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#607D8B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#607D8B',
  },
  filterBadgeTextActive: {
    color: '#FFFFFF',
  },

  // Reports List
  reportsList: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#607D8B',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9E9E9E',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BDBDBD',
    marginTop: 4,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  reportCardActive: {
    borderColor: '#4CAF50',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reportCardLeft: {
    flex: 1,
    marginRight: 16,
  },
  reportCategory: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 4,
  },
  reportDescription: {
    fontSize: 14,
    color: '#607D8B',
    marginBottom: 8,
    lineHeight: 20,
  },
  reportLocation: {
    fontSize: 13,
    color: '#9E9E9E',
  },
  reportCardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  urgentFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF5252',
  },
  reportCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  reportDate: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  reportId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#BDBDBD',
  },

  // Detail Panel
  detailPanel: {
    width: 360,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: '#E0E0E0',
    padding: 24,
  },
  detailEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  detailEmptyText: {
    fontSize: 15,
    color: '#9E9E9E',
    marginTop: 16,
    textAlign: 'center',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
    flex: 1,
  },
  mapPreview: {
    backgroundColor: '#E8F5E9',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  mapPreviewText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 8,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#607D8B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 15,
    color: '#333333',
    lineHeight: 22,
  },
  detailSubtext: {
    fontSize: 13,
    color: '#9E9E9E',
    marginTop: 4,
  },
  timeline: {
    gap: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#9E9E9E',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 13,
    color: '#9E9E9E',
  },
  actionButtons: {
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
  },
  escalateButton: {
    backgroundColor: '#FF9800',
  },
  assignButton: {
    backgroundColor: '#2196F3',
  },
  exportSingleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  statusButtonActive: {
    backgroundColor: 'rgba(76,175,80,0.1)',
  },
  statusButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#607D8B',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  quickStatItem: {
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 4,
  },
  volunteerList: {
    marginVertical: 16,
  },
  volunteerNote: {
    fontSize: 14,
    color: '#607D8B',
    lineHeight: 20,
    textAlign: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    width: 400,
    maxWidth: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 15,
    color: '#607D8B',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#607D8B',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
