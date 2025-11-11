# EcoBhandu - MongoDB Authentication Integration

## ✅ Completed Features

### 1. Database Connection
- **File**: `lib/mongodb.ts`
- **Description**: Manages MongoDB connection with connection caching for performance
- **Database**: `ecobhandu` on `localhost:27017`
- **Collections**: `users` (with role-based storage)

### 2. Authentication Module
- **File**: `lib/auth.ts`
- **Functions**:
  - `createUser()`: Creates new user with hashed password and role (citizen/volunteer)
  - `authenticateUser()`: Verifies email/password and returns user data with role
- **Security**: bcrypt password hashing with 10 salt rounds

### 3. Sign Up Integration
- **File**: `app/signup.tsx`
- **Features**:
  - Form validation (required fields, min 6 char password)
  - Role-based account creation (citizen/volunteer)
  - Duplicate email detection
  - Loading states and error handling
  - Success alerts

### 4. Sign In Integration
- **File**: `app/signin.tsx`
- **Features**:
  - Email/password authentication
  - Role verification (ensures user's role matches selected role)
  - Loading states and error handling
  - Success alerts with user name

## 🗄️ Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (lowercase, unique),
  password: String (bcrypt hashed),
  role: 'citizen' | 'volunteer',
  createdAt: Date
}
```

## 🔐 Authentication Flow

1. **Onboarding**: User selects role (Citizen or Volunteer)
2. **Sign Up**:
   - User enters: name, email, password
   - System creates account with selected role
   - Password is hashed before storage
   - Success → navigates to main app
3. **Sign In**:
   - User enters: email, password
   - System verifies credentials
   - System checks role matches selection
   - Success → navigates to main app

## 🧪 Testing

### Test Script
Run the test script to create sample users and verify authentication:

```bash
node test-auth.js
```

### Test Credentials
After running the test script, you can use these credentials in the app:

**Citizen Account:**
- Email: `test.citizen@example.com`
- Password: `password123`

**Volunteer Account:**
- Email: `test.volunteer@example.com`
- Password: `password456`

## 🚀 Usage

### Prerequisites
1. MongoDB Community Server 8.0.11 running on `localhost:27017`
2. Dependencies installed: `npm install`

### Running the App
```bash
npx expo start
```

### Creating a New Account
1. Launch app → "Get Started"
2. Select role (Citizen or Volunteer)
3. Click "Continue"
4. Fill in Name, Email, Password
5. Click "Create account"

### Signing In
1. Launch app → "Get Started"
2. Select role (Citizen or Volunteer)
3. Click "Continue"
4. Enter Email and Password
5. Click "Sign in"

## 🔑 Key Features

### Role-Based Authentication
- Citizens and Volunteers are stored in the same collection with different `role` values
- Sign-in validates that the user's stored role matches their selected role
- This enables future role-based features and permissions

### Security
- ✅ Passwords are hashed with bcrypt (never stored in plaintext)
- ✅ Email validation and duplicate detection
- ✅ Password minimum length requirement (6 characters)
- ✅ Role verification prevents cross-role access

### Error Handling
- ✅ Form validation with user-friendly error messages
- ✅ Duplicate email detection
- ✅ Invalid credentials handling
- ✅ Database connection error handling
- ✅ Loading states during async operations

## 📦 Packages Used

- `mongodb@6.12.0`: MongoDB Node.js driver
- `bcryptjs@2.4.3`: Password hashing
- `@types/bcryptjs@2.4.6`: TypeScript types for bcryptjs

## 🔄 Next Steps

1. **Session Management**: Store authenticated user data (AsyncStorage/SecureStore)
2. **Forgot Password**: Implement password reset flow
3. **Google OAuth**: Integrate Google Sign-In with role selection
4. **Profile Management**: Allow users to view/edit their profile
5. **Role-Based UI**: Show different features based on user role
6. **Logout**: Add logout functionality to clear session

## 📝 Notes

- MongoDB connection is automatically managed (connects on first use)
- Connection is cached and reused across requests
- All database operations include proper error handling
- Console logs track authentication flow for debugging
