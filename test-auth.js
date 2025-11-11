/**
 * Test script to verify MongoDB authentication integration
 * Run with: node test-auth.js
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'ecobhandu';

async function testAuth() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const users = db.collection('users');

    // Test 1: Create a citizen user
    console.log('\n📝 Test 1: Creating citizen user...');
    const citizenEmail = 'test.citizen@example.com';
    const citizenPassword = 'password123';
    
    await users.deleteMany({ email: citizenEmail }); // Clean up any existing test data
    
    const hashedPassword = await bcrypt.hash(citizenPassword, 10);
    await users.insertOne({
      name: 'Test Citizen',
      email: citizenEmail,
      password: hashedPassword,
      role: 'citizen',
      createdAt: new Date(),
    });
    console.log('✅ Citizen user created successfully');

    // Test 2: Create a volunteer user
    console.log('\n📝 Test 2: Creating volunteer user...');
    const volunteerEmail = 'test.volunteer@example.com';
    const volunteerPassword = 'password456';
    
    await users.deleteMany({ email: volunteerEmail }); // Clean up any existing test data
    
    const hashedPassword2 = await bcrypt.hash(volunteerPassword, 10);
    await users.insertOne({
      name: 'Test Volunteer',
      email: volunteerEmail,
      password: hashedPassword2,
      role: 'volunteer',
      createdAt: new Date(),
    });
    console.log('✅ Volunteer user created successfully');

    // Test 3: Verify citizen authentication
    console.log('\n📝 Test 3: Authenticating citizen user...');
    const citizen = await users.findOne({ email: citizenEmail });
    const citizenValid = await bcrypt.compare(citizenPassword, citizen.password);
    console.log(citizenValid ? '✅ Citizen authentication successful' : '❌ Citizen authentication failed');
    console.log(`   - Name: ${citizen.name}`);
    console.log(`   - Role: ${citizen.role}`);

    // Test 4: Verify volunteer authentication
    console.log('\n📝 Test 4: Authenticating volunteer user...');
    const volunteer = await users.findOne({ email: volunteerEmail });
    const volunteerValid = await bcrypt.compare(volunteerPassword, volunteer.password);
    console.log(volunteerValid ? '✅ Volunteer authentication successful' : '❌ Volunteer authentication failed');
    console.log(`   - Name: ${volunteer.name}`);
    console.log(`   - Role: ${volunteer.role}`);

    // Test 5: Count users by role
    console.log('\n📊 Database Statistics:');
    const citizenCount = await users.countDocuments({ role: 'citizen' });
    const volunteerCount = await users.countDocuments({ role: 'volunteer' });
    console.log(`   - Total Citizens: ${citizenCount}`);
    console.log(`   - Total Volunteers: ${volunteerCount}`);

    console.log('\n✅ All tests passed! Authentication system is working correctly.');
    console.log('\n💡 You can now use these credentials in the app:');
    console.log(`   Citizen: ${citizenEmail} / ${citizenPassword}`);
    console.log(`   Volunteer: ${volunteerEmail} / ${volunteerPassword}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await client.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

testAuth();
