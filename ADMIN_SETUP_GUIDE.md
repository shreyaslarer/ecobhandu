# Admin Dashboard Setup Guide

## 🚀 Quick Start

The Admin Dashboard is now integrated into your EcoBhandu app! Here's how to access and use it.

## 📍 Access Points

### Option 1: From Login Screen
1. Open the app
2. On the splash/login screen, look for "🔐 Admin Dashboard" link at the bottom
3. Tap to access directly

### Option 2: From Profile (Authenticated Users)
1. Sign in as any user (Citizen or Volunteer)
2. Navigate to the Profile/Explore tab
3. Scroll to the "Admin" section
4. Tap "🔐 Admin Dashboard"

### Option 3: Direct URL (Web Only)
```
http://localhost:8081/admin-dashboard
```

## 💻 Best Experience

### Recommended Setup
- **Platform**: Web browser (Chrome, Firefox, Safari, Edge)
- **Screen Size**: 1440px width or larger
- **Resolution**: 1920x1080 or higher

### Supported Platforms
✅ **Desktop Web** - Full features, optimal experience
✅ **Tablet** - Simplified layout, core features
⚠️ **Mobile** - Limited view with warning message

## 🎯 Key Features

### 1. Dashboard Overview
- **4 KPI Cards**: Open Issues, Resolved Today, Avg Response Time, Total Reports
- **Real-time Data**: Auto-updates from your MongoDB database
- **Color-coded Metrics**: Visual indicators for quick insights

### 2. Reports Management
- **List View**: Scrollable feed of all reports
- **Detail Panel**: Click any report to see full details
- **Status Tracking**: Visual timeline of report lifecycle
- **Quick Actions**: Escalate, Assign, Export

### 3. Filtering & Search
- **Status Filters**: All, Escalated, Open, Closed
- **Date Filters**: Today, Week, Month, All
- **Search Bar**: Find reports by description, category, or location
- **Real-time Results**: Instant filtering as you type

### 4. Data Export
- **CSV Export**: Download filtered reports
- **Batch Export**: Export multiple reports at once
- **Custom Filename**: Auto-generated with date stamp

## 🔧 Configuration

### No Additional Setup Required!
The admin dashboard uses your existing:
- MongoDB connection (localhost:27017)
- Express API server (port 3000)
- Authentication system
- Report data

### Optional Enhancements

#### Add Admin Role (Recommended)
Currently, any authenticated user can access the dashboard. To restrict access:

1. **Update User Schema** (server.js):
```javascript
// Add isAdmin field to users collection
{
  name: String,
  email: String,
  password: String,
  role: 'citizen' | 'volunteer',
  isAdmin: Boolean, // Add this
  createdAt: Date
}
```

2. **Create Admin Middleware**:
```javascript
// In server.js
function requireAdmin(req, res, next) {
  const { userId } = req.body;
  const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
```

3. **Protect Admin Routes**:
```javascript
app.get('/api/admin/*', requireAdmin, (req, res) => {
  // Admin-only endpoints
});
```

## 📊 Understanding the Dashboard

### KPI Cards Explained

#### 🟠 Open Issues
- Reports with status "Pending" or "In Progress"
- Indicates workload for volunteers
- High numbers may require more volunteer recruitment

#### 🟢 Resolved Today
- Reports resolved since midnight
- Measures daily productivity
- Resets at 00:00 local time

#### 🔵 Average Response Time
- Mean hours from report creation to resolution
- Lower is better
- Helps identify bottlenecks

#### 🟣 Total Reports
- All-time report count
- Shows platform growth
- Historical metric

### Report Status Colors

| Status | Color | Meaning |
|--------|-------|---------|
| Pending | 🟡 Yellow | Awaiting assignment |
| In Progress | 🔵 Blue | Volunteer working on it |
| Resolved | 🟢 Green | Successfully completed |
| Rejected | 🔴 Red | Invalid or duplicate |

### Severity Levels

| Severity | Color | Priority |
|----------|-------|----------|
| Critical | 🔴 Red | Immediate action required |
| Major | 🟠 Orange | High priority |
| Minor | 🟢 Green | Standard priority |

## 🎨 Customization

### Branding
Update organization name in `admin-dashboard.tsx`:
```typescript
<Text style={styles.orgName}>Your Organization Name</Text>
<Text style={styles.orgSubtitle}>Your Subtitle</Text>
```

### Color Scheme
Modify colors in the styles section:
```typescript
const styles = StyleSheet.create({
  // Change primary color
  navItemActive: {
    backgroundColor: '#YOUR_COLOR', // Default: #E8F5E9
  },
  // Change accent color
  exportButton: {
    backgroundColor: '#YOUR_COLOR', // Default: #4CAF50
  },
});
```

### KPI Thresholds
Adjust alert thresholds:
```typescript
const calculateKPIs = (reportsData: Report[]) => {
  // Add custom logic
  if (openIssues > 50) {
    // Trigger alert
  }
};
```

## 🔍 Troubleshooting

### Dashboard Not Loading
1. Check MongoDB is running: `mongod --version`
2. Verify API server is running: `node server.js`
3. Check console for errors: Open browser DevTools (F12)

### No Reports Showing
1. Verify reports exist in database:
   ```bash
   mongosh
   use ecobhandu
   db.reports.countDocuments()
   ```
2. Check API endpoint: `http://localhost:3000/api/reports`
3. Review network tab in browser DevTools

### Export Not Working
1. Ensure you're on web platform (not mobile)
2. Check browser allows downloads
3. Verify filtered reports exist
4. Check console for JavaScript errors

### Slow Performance
1. Reduce report limit in `loadDashboardData()`:
   ```typescript
   const reportsData = await getReports({ limit: 100 }); // Reduce from 200
   ```
2. Implement pagination (future enhancement)
3. Add database indexes (see MONGODB_INTEGRATION.md)

## 📱 Mobile Access

While the dashboard is optimized for desktop, you can still access it on mobile:

1. **Landscape Mode**: Rotate device for better view
2. **Zoom Out**: Pinch to see more content
3. **Simplified View**: Core features still accessible
4. **Warning Message**: Displayed to inform about limitations

## 🔐 Security Best Practices

### Production Deployment

1. **Add Authentication**:
   - Implement admin role checks
   - Use JWT tokens for API authentication
   - Add session management

2. **Secure API Endpoints**:
   - Add rate limiting
   - Implement CORS properly
   - Use HTTPS in production

3. **Data Privacy**:
   - Mask sensitive user information
   - Implement audit logging
   - Add data retention policies

4. **Access Control**:
   - Create admin user accounts
   - Implement 2FA for admin access
   - Log all admin actions

## 📈 Analytics & Insights

### Metrics to Monitor

1. **Response Time Trends**:
   - Track average over time
   - Identify peak hours
   - Optimize volunteer scheduling

2. **Category Distribution**:
   - Most common issue types
   - Resource allocation
   - Training priorities

3. **Geographic Patterns**:
   - Hotspot identification
   - Zone-based volunteer assignment
   - Targeted awareness campaigns

4. **Volunteer Performance**:
   - Tasks completed per volunteer
   - Average resolution time
   - Quality ratings

## 🚀 Next Steps

### Immediate Actions
1. ✅ Access the dashboard
2. ✅ Familiarize yourself with the interface
3. ✅ Test filtering and search
4. ✅ Try exporting a CSV

### Short-term Goals
1. 📊 Set up regular monitoring schedule
2. 👥 Train team members on dashboard usage
3. 📈 Establish KPI targets
4. 🔐 Implement admin authentication

### Long-term Vision
1. 🗺️ Implement interactive map view
2. 📧 Add email notifications
3. 📊 Create custom analytics reports
4. 🤖 Integrate AI-powered insights

## 💡 Tips & Tricks

### Keyboard Shortcuts (Future)
- `Ctrl/Cmd + F`: Focus search
- `Ctrl/Cmd + E`: Export CSV
- `Esc`: Close detail panel

### Workflow Optimization
1. **Morning Routine**: Check "Resolved Today" KPI
2. **Triage**: Filter by "Escalated" first
3. **Assignment**: Use "Open" filter for volunteer assignment
4. **Review**: Check "Closed" for quality assurance

### Data Management
1. **Regular Exports**: Weekly CSV backups
2. **Archive Old Reports**: Monthly cleanup
3. **Monitor Trends**: Track KPIs over time
4. **Feedback Loop**: Share insights with volunteers

## 📞 Support

Need help? Here's how to get support:

1. **Documentation**: Check ADMIN_DASHBOARD.md for detailed info
2. **Code Comments**: Review inline comments in admin-dashboard.tsx
3. **API Docs**: See MONGODB_INTEGRATION.md for backend details
4. **Community**: Reach out to the development team

## 🎉 Success!

You're now ready to use the EcoBhandu Admin Dashboard! Start by:
1. Opening the dashboard
2. Exploring the interface
3. Filtering some reports
4. Exporting your first CSV

Happy monitoring! 🌱
