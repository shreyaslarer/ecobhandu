# EcoBhandu Admin Dashboard

## 🎯 Overview

The Admin Dashboard is a web-optimized interface for authorities, NGOs, and administrators to monitor, manage, and analyze environmental reports across the EcoBhandu platform.

## ✨ Features

### 📊 Real-Time Analytics
- **KPI Cards**: Live metrics for open issues, resolved today, average response time, and total reports
- **Dynamic Filtering**: Filter by date (today, week, month, all)
- **Search Functionality**: Full-text search across reports
- **Status Filters**: All, Escalated, Open, Closed

### 📋 Reports Management
- **Three-Column Layout**:
  - **Left**: Navigation sidebar (Dashboard, Reports, Volunteers, Zones, Rewards)
  - **Middle**: Reports feed with filters and search
  - **Right**: Detailed report view with timeline and actions

### 🗺️ Map Integration
- Toggle between List and Map view
- Heatmap visualization of report density
- Coordinate display for each report
- Geographic clustering

### 📤 Export Capabilities
- **CSV Export**: Export filtered reports to CSV
- **Single Report Export**: Export individual report details
- **Batch Operations**: Bulk actions on selected reports

### ⚡ Quick Actions
- **Escalate**: Flag urgent issues for immediate attention
- **Assign**: Assign reports to volunteers
- **Timeline View**: Track report lifecycle from creation to resolution

## 🚀 Access

### From Mobile App
1. Navigate to Profile/Explore tab
2. Scroll to "Admin" section
3. Tap "🔐 Admin Dashboard"

### Direct URL (Web)
```
http://localhost:8081/admin-dashboard
```

## 📱 Responsive Design

### Desktop (Recommended)
- **Minimum Width**: 1024px
- **Optimal**: 1440px+
- Full three-column layout with all features

### Tablet
- **Width**: 768px - 1023px
- Two-column layout (navigation + content)
- Detail panel as modal

### Mobile
- **Width**: < 768px
- Single column with warning message
- Simplified view with essential features

## 🎨 Design System

### Color Palette
- **Primary**: `#4CAF50` (Green)
- **Accent**: `#C3D105` (Yellow-Green)
- **Status Colors**:
  - Pending: `#FCD34D`
  - In Progress: `#60A5FA`
  - Resolved: `#34D399`
  - Rejected: `#F87171`
- **Severity Colors**:
  - Critical: `#FF5252`
  - Major: `#FF9800`
  - Minor: `#4CAF50`

### Typography
- **Headers**: 20-24px, Bold
- **Body**: 14-15px, Regular
- **Labels**: 13px, Semibold, Uppercase
- **Metadata**: 12-13px, Regular

## 📊 KPI Metrics

### Open Issues
- Count of reports with status "Pending" or "In Progress"
- Real-time updates
- Orange warning indicator

### Resolved Today
- Reports resolved since midnight
- Green success indicator
- Resets daily

### Average Response Time
- Mean time from report creation to resolution
- Calculated in hours
- Blue info indicator

### Total Reports
- All-time report count
- Purple analytics indicator

## 🔍 Filtering System

### Status Filters
1. **All**: Show all reports
2. **Escalated**: Urgent or Critical severity reports
3. **Open**: Pending + In Progress
4. **Closed**: Resolved + Rejected

### Date Filters
- **Today**: Reports from today
- **Week**: Last 7 days
- **Month**: Last 30 days
- **All**: No date restriction

### Search
- Searches across:
  - Description
  - Category
  - Location
- Real-time filtering
- Case-insensitive

## 📋 Report Card Details

Each report card displays:
- **Category**: Issue type
- **Description**: Brief summary (2 lines max)
- **Location**: Geographic location with pin icon
- **Status Badge**: Current status with color coding
- **Severity Badge**: Priority level
- **Urgent Flag**: Red flag for urgent issues
- **Timestamp**: Creation date and time
- **Report ID**: Last 8 characters of MongoDB ID

## 🔧 Detail Panel

### Information Sections
1. **Map Preview**: Coordinates display
2. **Description**: Full issue description
3. **Location**: Complete address
4. **Reporter**: Name and email
5. **Timeline**: Event history with timestamps

### Action Buttons
- **Escalate**: Mark as high priority
- **Assign**: Assign to volunteer
- **Export**: Download report details

## 📤 CSV Export Format

Exported CSV includes:
```csv
ID,Category,Description,Location,Severity,Status,Created,Resolved
```

### Export Process
1. Apply desired filters
2. Click "Export CSV" button
3. Confirm export in modal
4. File downloads automatically (web)
5. Filename: `ecobhandu-reports-YYYY-MM-DD.csv`

## 🔐 Security Considerations

### Access Control
- Currently accessible to all authenticated users
- **Recommended**: Add role-based access control
- **Future**: Admin-only authentication layer

### Data Privacy
- Sensitive user information displayed
- **Recommended**: Implement data masking
- **Future**: Audit logging for admin actions

## 🛠️ Technical Implementation

### File Location
```
ecobhandu/app/admin-dashboard.tsx
```

### Dependencies
- React Native
- Expo Router
- AsyncStorage (for preferences)
- Custom API client (`lib/api.ts`)

### API Endpoints Used
- `GET /api/reports` - Fetch all reports
- `GET /api/reports/stats/summary` - Get statistics
- `PATCH /api/reports/:id/status` - Update status
- `POST /api/reports/:id/comment` - Add comments

### State Management
- Local React state
- Real-time data fetching
- Optimistic UI updates

## 📈 Performance Optimization

### Data Loading
- Initial load: 200 reports
- Pagination: Not yet implemented
- Caching: Client-side filtering

### Rendering
- Virtualized lists for large datasets
- Memoized components
- Debounced search input

## 🔄 Future Enhancements

### Phase 1 (Immediate)
- [ ] Role-based authentication
- [ ] Pagination for large datasets
- [ ] Real-time updates (WebSocket)
- [ ] Advanced filtering (multi-select)

### Phase 2 (Short-term)
- [ ] Interactive map with clustering
- [ ] Bulk actions (assign, escalate, export)
- [ ] Custom report templates
- [ ] Email notifications

### Phase 3 (Long-term)
- [ ] Analytics dashboard with charts
- [ ] Volunteer performance metrics
- [ ] Predictive analytics
- [ ] Mobile app version

## 🐛 Known Issues

1. **Mobile View**: Limited functionality on small screens
2. **Map View**: Not yet implemented (placeholder)
3. **Pagination**: All reports loaded at once
4. **Real-time**: Manual refresh required

## 📞 Support

For issues or feature requests:
- Check existing reports in the app
- Contact development team
- Submit GitHub issue (if applicable)

## 📝 Changelog

### Version 1.0.0 (Current)
- Initial release
- Three-column desktop layout
- KPI cards and analytics
- Filtering and search
- CSV export
- Report detail panel
- Timeline view
- Action buttons

---

**Last Updated**: November 2025
**Maintained By**: EcoBhandu Development Team
