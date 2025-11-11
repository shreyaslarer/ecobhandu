const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;

// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'ecobhandu';
let db = null;
const REWARDS = [
  { id: 'water-bottle', title: 'Reusable Bottle', description: 'Eco-friendly stainless bottle', cost: 120, sponsor: 'GreenCo' },
  { id: 'tshirt', title: 'Eco Tee', description: 'Organic cotton volunteer t-shirt', cost: 200, sponsor: 'EarthWear' },
  { id: 'voucher', title: 'Local Cafe Voucher', description: 'Free sustainable coffee voucher', cost: 300, sponsor: 'BeanCycle' },
  { id: 'tree', title: 'Tree Planting Slot', description: 'Sponsor a sapling planting', cost: 450, sponsor: 'PlantMore' },
];

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Increased limit for base64 images
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Connect to MongoDB
async function connectDB() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('✅ Connected to MongoDB');
    
    // Create indexes for better performance
    await createIndexes();
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Create database indexes
async function createIndexes() {
  try {
    const users = db.collection('users');
    const reports = db.collection('reports');
    const rewardClaims = db.collection('reward_claims');

    // Users collection indexes
    await users.createIndex({ email: 1 }, { unique: true });
    await users.createIndex({ role: 1 });

    // Reports collection indexes
    await reports.createIndex({ userId: 1 });
    await reports.createIndex({ status: 1 });
    await reports.createIndex({ category: 1 });
    await reports.createIndex({ severity: 1 });
    await reports.createIndex({ createdAt: -1 });
    await reports.createIndex({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 });
    await reports.createIndex({ location: 'text', description: 'text' }); // Text search

    // Reward claims collection indexes
    await rewardClaims.createIndex({ userId: 1, createdAt: -1 });

    console.log('✅ Database indexes created');
  } catch (error) {
    console.warn('⚠️  Index creation warning:', error.message);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'EcoBhandu API Server is running' });
});

// Sign up endpoint
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (!['citizen', 'volunteer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const users = db.collection('users');

    // Check if user exists
    const existingUser = await users.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await users.insertOne({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      createdAt: new Date(),
    });

    console.log(`✅ User created: ${email} as ${role}`);

    res.status(201).json({
      id: result.insertedId.toString(),
      name: name.trim(),
      email: email.toLowerCase(),
      role,
    });
  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sign in endpoint
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const users = db.collection('users');

    // Find user
    const user = await users.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check role if provided
    if (role && user.role !== role) {
      return res.status(403).json({ 
        error: `This account is registered as a ${user.role}. Please select the correct role.` 
      });
    }

    console.log(`✅ User authenticated: ${user.email} as ${user.role}`);

    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error('❌ Signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== ISSUE REPORTS ENDPOINTS ====================

// Create a new issue report
app.post('/api/reports/create', async (req, res) => {
  try {
    const {
      userId,
      userName,
      userEmail,
      category,
      description,
      severity,
      isUrgent,
      location,
      coordinates,
      image,
    } = req.body;

    // Validation
    if (!userId || !category || !description || !location || !coordinates) {
      return res.status(400).json({ 
        error: 'Required fields: userId, category, description, location, coordinates' 
      });
    }

    if (!coordinates.latitude || !coordinates.longitude) {
      return res.status(400).json({ 
        error: 'Coordinates must include latitude and longitude' 
      });
    }

    const reports = db.collection('reports');
    const users = db.collection('users');

    // Verify user exists
    const user = await users.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create report document
    const reportData = {
      userId: new ObjectId(userId),
      userName: userName || user.name,
      userEmail: userEmail || user.email,
      category,
      description,
      severity: severity || 'Minor',
      isUrgent: isUrgent || false,
      location,
      coordinates: {
        latitude: parseFloat(coordinates.latitude),
        longitude: parseFloat(coordinates.longitude),
      },
      image: image || null, // Base64 image string
      status: 'Pending', // Pending, In Progress, Resolved, Rejected
      assignedTo: null, // Will be assigned to volunteer later
      createdAt: new Date(),
      updatedAt: new Date(),
      resolvedAt: null,
      resolvedBy: null,
      resolutionNotes: null,
      resolvedImage: null,
      upvotes: 0,
      upvotedBy: [],
      comments: [],
    };

    const result = await reports.insertOne(reportData);

    // Update user's report count
    await users.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $inc: { totalReports: 1 },
        $set: { lastReportDate: new Date() }
      }
    );

    console.log(`✅ Report created: ${result.insertedId} by ${user.email}`);

    res.status(201).json({
      id: result.insertedId.toString(),
      message: 'Report submitted successfully',
      report: {
        ...reportData,
        _id: result.insertedId,
        userId: userId,
      },
    });
  } catch (error) {
    console.error('❌ Create report error:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Get all reports (with filters)
app.get('/api/reports', async (req, res) => {
  try {
    const { status, category, severity, userId, limit = 50 } = req.query;
    
    console.log('📥 GET /api/reports - Query params:', { status, category, severity, userId, limit });
    
    const reports = db.collection('reports');
    
    // Build query
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (severity) query.severity = severity;
    if (userId) {
      query.userId = new ObjectId(userId);
      console.log('🔍 Filtering by userId:', userId, '-> ObjectId:', query.userId);
    }

    console.log('🔍 MongoDB Query:', JSON.stringify(query));

    const reportsList = await reports
      .find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .toArray();

    console.log('✅ Found', reportsList.length, 'reports');
    if (userId && reportsList.length > 0) {
      console.log('📊 Sample report userId:', reportsList[0].userId);
    }

    res.json({
      count: reportsList.length,
      reports: reportsList,
    });
  } catch (error) {
    console.error('❌ Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get single report by ID
app.get('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }

    const reports = db.collection('reports');
    const report = await reports.findOne({ _id: new ObjectId(id) });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error('❌ Get report error:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// Update report status
app.patch('/api/reports/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }

    const validStatuses = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const reports = db.collection('reports');
    
    const updateData = {
      updatedAt: new Date(),
    };
    
    if (status) updateData.status = status;
    if (assignedTo) updateData.assignedTo = new ObjectId(assignedTo);
    if (status === 'Resolved') updateData.resolvedAt = new Date();

    const result = await reports.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    console.log(`✅ Report ${id} status updated to: ${status}`);

    res.json({ message: 'Report status updated successfully' });
  } catch (error) {
    console.error('❌ Update report status error:', error);
    res.status(500).json({ error: 'Failed to update report status' });
  }
});

// Resolve a report with after image and notes
app.patch('/api/reports/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, notes, image } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }
    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const reports = db.collection('reports');
    const result = await reports.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'Resolved',
          resolvedAt: new Date(),
          resolvedBy: new ObjectId(userId),
          resolutionNotes: notes || null,
          resolvedImage: image || null,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    console.log(`✅ Report ${id} resolved by ${userId}`);
    res.json({ message: 'Report resolved successfully' });
  } catch (error) {
    console.error('❌ Resolve report error:', error);
    res.status(500).json({ error: 'Failed to resolve report' });
  }
});

// Upvote a report
app.post('/api/reports/:id/upvote', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!ObjectId.isValid(id) || !ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const reports = db.collection('reports');
    const report = await reports.findOne({ _id: new ObjectId(id) });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const userIdObj = new ObjectId(userId);
    const hasUpvoted = report.upvotedBy?.some(id => id.equals(userIdObj));

    if (hasUpvoted) {
      // Remove upvote
      await reports.updateOne(
        { _id: new ObjectId(id) },
        {
          $pull: { upvotedBy: userIdObj },
          $inc: { upvotes: -1 },
          $set: { updatedAt: new Date() }
        }
      );
      res.json({ message: 'Upvote removed', upvoted: false });
    } else {
      // Add upvote
      await reports.updateOne(
        { _id: new ObjectId(id) },
        {
          $addToSet: { upvotedBy: userIdObj },
          $inc: { upvotes: 1 },
          $set: { updatedAt: new Date() }
        }
      );
      res.json({ message: 'Report upvoted', upvoted: true });
    }

    console.log(`✅ Report ${id} upvote toggled by user ${userId}`);
  } catch (error) {
    console.error('❌ Upvote error:', error);
    res.status(500).json({ error: 'Failed to upvote report' });
  }
});

// Add comment to report
app.post('/api/reports/:id/comment', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, userName, comment } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }

    if (!userId || !comment) {
      return res.status(400).json({ error: 'userId and comment are required' });
    }

    const reports = db.collection('reports');
    
    const commentData = {
      _id: new ObjectId(),
      userId: new ObjectId(userId),
      userName,
      comment: comment.trim(),
      createdAt: new Date(),
    };

    const result = await reports.updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { comments: commentData },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    console.log(`✅ Comment added to report ${id}`);

    res.json({ 
      message: 'Comment added successfully',
      comment: commentData 
    });
  } catch (error) {
    console.error('❌ Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Get reports statistics
app.get('/api/reports/stats/summary', async (req, res) => {
  try {
    const reports = db.collection('reports');
    
    const stats = await reports.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          bySeverity: [
            { $group: { _id: '$severity', count: { $sum: 1 } } }
          ],
          byCategory: [
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
        }
      }
    ]).toArray();

    res.json({
      total: stats[0].total[0]?.count || 0,
      byStatus: stats[0].byStatus,
      bySeverity: stats[0].bySeverity,
      topCategories: stats[0].byCategory,
    });
  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// =============== VOLUNTEER STATS & REWARDS ===============

// Get volunteer stats (completed, in-progress, ecoPoints)
app.get('/api/volunteers/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    const reports = db.collection('reports');
    const assignedCursor = reports.find({ assignedTo: new ObjectId(id) });
    const assigned = await assignedCursor.toArray();
    const completed = assigned.filter(r => r.status === 'Resolved').length;
    const inProgress = assigned.filter(r => r.status === 'In Progress').length;
    const ecoPoints = (completed * 10) + (inProgress * 5);
    res.json({ tasksCompleted: completed, inProgress, ecoPoints });
  } catch (error) {
    console.error('❌ Get volunteer stats error:', error);
    res.status(500).json({ error: 'Failed to fetch volunteer stats' });
  }
});

// Rewards catalog
app.get('/api/rewards', async (_req, res) => {
  res.json({ rewards: REWARDS });
});

// Get a user's reward claims
app.get('/api/rewards/claims', async (req, res) => {
  try {
    const { userId, limit = 50 } = req.query;
    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    const rewardClaims = db.collection('reward_claims');
    const claims = await rewardClaims
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .toArray();
    res.json({ claims });
  } catch (error) {
    console.error('❌ Get reward claims error:', error);
    res.status(500).json({ error: 'Failed to fetch reward claims' });
  }
});

// Claim a reward
app.post('/api/rewards/claim', async (req, res) => {
  try {
    const { userId, rewardId } = req.body;
    if (!userId || !ObjectId.isValid(userId) || !rewardId) {
      return res.status(400).json({ error: 'userId and rewardId are required' });
    }

    const reward = REWARDS.find(r => r.id === rewardId);
    if (!reward) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    // Compute available points from reports
    const reportsCol = db.collection('reports');
    const assigned = await reportsCol.find({ assignedTo: new ObjectId(userId) }).toArray();
    const completed = assigned.filter(r => r.status === 'Resolved').length;
    const inProgress = assigned.filter(r => r.status === 'In Progress').length;
    const ecoPoints = (completed * 10) + (inProgress * 5);

    // Sum previously spent points
    const rewardClaims = db.collection('reward_claims');
    const existingClaims = await rewardClaims.find({ userId: new ObjectId(userId) }).toArray();
    const spent = existingClaims.reduce((sum, c) => sum + (c.cost || 0), 0);
    const available = Math.max(ecoPoints - spent, 0);

    if (available < reward.cost) {
      return res.status(400).json({ error: 'Not enough points to claim this reward' });
    }

    const claimDoc = {
      userId: new ObjectId(userId),
      rewardId: reward.id,
      title: reward.title,
      cost: reward.cost,
      sponsor: reward.sponsor || null,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await rewardClaims.insertOne(claimDoc);
    res.status(201).json({ 
      message: 'Reward claimed',
      claim: { ...claimDoc, _id: result.insertedId }
    });
  } catch (error) {
    console.error('❌ Claim reward error:', error);
    res.status(500).json({ error: 'Failed to claim reward' });
  }
});

// Delete a report (admin/creator only)
app.delete('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }

    const reports = db.collection('reports');
    const report = await reports.findOne({ _id: new ObjectId(id) });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Check if user is the creator
    if (userId && report.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this report' });
    }

    await reports.deleteOne({ _id: new ObjectId(id) });

    console.log(`✅ Report ${id} deleted`);

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('❌ Delete report error:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

// Start server
async function startServer() {
  await connectDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 EcoBhandu API Server running on http://localhost:${PORT}`);
    console.log(`📱 Mobile access: http://10.192.228.16:${PORT}`);
    console.log(`📊 MongoDB: ${DB_NAME} at ${MONGODB_URI}`);
    console.log(`\n✅ Ready to accept requests`);
  });
}

startServer();
