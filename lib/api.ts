// API Configuration and Services
// Base URL for the API server

// Prefer environment override if provided (e.g., via expo constants or process.env)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.192.228.16:3000/api';

// Helper function for API calls
async function apiCall(endpoint: string, options: RequestInit = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ==================== REPORT SERVICES ====================

export interface CreateReportData {
  userId: string;
  userName: string;
  userEmail: string;
  category: string;
  description: string;
  severity: 'Minor' | 'Major' | 'Critical';
  isUrgent: boolean;
  location: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  image?: string; // Base64 encoded image
}

export interface Report extends CreateReportData {
  _id: string;
  status: 'Pending' | 'In Progress' | 'Resolved' | 'Rejected';
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolvedBy?: string | null;
  resolutionNotes?: string | null;
  resolvedImage?: string | null;
  upvotes: number;
  upvotedBy: string[];
  comments: Comment[];
}

export interface Comment {
  _id: string;
  userId: string;
  userName: string;
  comment: string;
  createdAt: string;
}

// ==================== REWARDS & STATS ====================
export interface RewardDefinition {
  id: string;
  title: string;
  description: string;
  cost: number;
  sponsor?: string;
}

export interface ClaimedReward {
  _id: string;
  userId: string;
  rewardId: string;
  title: string;
  cost: number;
  sponsor?: string | null;
  status: 'pending' | 'delivered';
  createdAt: string;
  updatedAt: string;
}

/**
 * Create a new issue report
 */
export async function createReport(reportData: CreateReportData): Promise<Report> {
  const response = await apiCall('/reports/create', {
    method: 'POST',
    body: JSON.stringify(reportData),
  });
  return response.report;
}

/**
 * Get all reports with optional filters
 */
export async function getReports(filters?: {
  status?: string;
  category?: string;
  severity?: string;
  userId?: string;
  limit?: number;
}): Promise<Report[]> {
  const queryParams = new URLSearchParams(
    Object.entries(filters || {}).map(([key, value]) => [key, String(value)])
  );
  const endpoint = `/reports${queryParams.toString() ? `?${queryParams}` : ''}`;
  
  console.log('🌐 API Call - getReports');
  console.log('🌐 Filters:', JSON.stringify(filters));
  console.log('🌐 Endpoint:', endpoint);
  
  const response = await apiCall(endpoint);
  
  console.log('🌐 Response count:', response.reports?.length || 0);
  
  return response.reports;
}

/**
 * Get a single report by ID
 */
export async function getReportById(reportId: string): Promise<Report> {
  return await apiCall(`/reports/${reportId}`);
}

/**
 * Update report status
 */
export async function updateReportStatus(
  reportId: string,
  status: string,
  assignedTo?: string
): Promise<void> {
  try {
    await apiCall(`/reports/${reportId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, assignedTo }),
    });
  } catch (error: any) {
    console.error('Update status failed', { reportId, status, assignedTo, error });
    throw error;
  }
}

/**
 * Upvote or remove upvote from a report
 */
export async function toggleUpvote(
  reportId: string,
  userId: string
): Promise<{ upvoted: boolean }> {
  return await apiCall(`/reports/${reportId}/upvote`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

/**
 * Add a comment to a report
 */
export async function addComment(
  reportId: string,
  userId: string,
  userName: string,
  comment: string
): Promise<Comment> {
  const response = await apiCall(`/reports/${reportId}/comment`, {
    method: 'POST',
    body: JSON.stringify({ userId, userName, comment }),
  });
  return response.comment;
}

/**
 * Get reports statistics
 */
export async function getReportsStats(): Promise<{
  total: number;
  byStatus: Array<{ _id: string; count: number }>;
  bySeverity: Array<{ _id: string; count: number }>;
  topCategories: Array<{ _id: string; count: number }>;
}> {
  return await apiCall('/reports/stats/summary');
}

/**
 * Delete a report
 */
export async function deleteReport(reportId: string, userId: string): Promise<void> {
  await apiCall(`/reports/${reportId}`, {
    method: 'DELETE',
    body: JSON.stringify({ userId }),
  });
}

// Volunteer stats (server-computed)
export async function getVolunteerStats(userId: string): Promise<{
  tasksCompleted: number;
  inProgress: number;
  ecoPoints: number;
}> {
  return await apiCall(`/volunteers/${userId}/stats`);
}

// Rewards catalog
export async function getRewards(): Promise<RewardDefinition[]> {
  const res = await apiCall('/rewards');
  return res.rewards as RewardDefinition[];
}

// Get user's reward claims
export async function getRewardClaims(userId: string, limit = 50): Promise<ClaimedReward[]> {
  const params = new URLSearchParams({ userId, limit: String(limit) });
  const res = await apiCall(`/rewards/claims?${params.toString()}`);
  return res.claims as ClaimedReward[];
}

// Claim a reward
export async function claimReward(userId: string, rewardId: string): Promise<ClaimedReward> {
  const res = await apiCall('/rewards/claim', {
    method: 'POST',
    body: JSON.stringify({ userId, rewardId }),
  });
  return res.claim as ClaimedReward;
}

// Resolve a report with after photo and notes
export async function resolveReport(
  reportId: string,
  userId: string,
  image: string | null,
  notes: string | null
): Promise<void> {
  await apiCall(`/reports/${reportId}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify({ userId, image, notes }),
  });
}
