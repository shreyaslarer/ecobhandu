# EcoBhandu - Environmental Action App 🌱

An Expo-based React Native application connecting citizens with environmental volunteer opportunities and initiatives.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Community Server 8.0.11 running on `localhost:27017`
- Expo Go app (for mobile testing) or Android/iOS emulator

### Installation

1. Install dependencies

   ```bash
   npm install
   ```

2. Verify MongoDB connection

   ```bash
   node test-auth.js
   ```

3. Start the app

   ```bash
   npx expo start
   ```

4. Open the app in:
   - **Expo Go**: Scan QR code with your phone
   - **Android Emulator**: Press `a`
   - **iOS Simulator**: Press `i`
   - **Web**: Press `w`

## 📱 Features

### ✅ Authentication System
- **Role-Based Registration**: Separate flows for Citizens and Volunteers
- **Secure Authentication**: bcrypt password hashing
- **MongoDB Integration**: User data stored with role differentiation
- **Form Validation**: Email validation, password requirements
- **Error Handling**: User-friendly error messages

### 🎯 Admin Dashboard V2 (DYNAMIC & REAL-TIME!)
- **🔴 LIVE Updates**: Auto-refresh every 10 seconds with real-time data
- **📊 Animated KPI Cards**: Pulse animations, trend indicators, and dynamic values
- **🔄 Smart Status Management**: One-click status changes with instant feedback
- **👥 Volunteer Assignment**: Professional assignment flow with confirmation
- **📋 Interactive Detail Panel**: Auto-selection, live updates, and quick stats
- **⚡ Manual Refresh**: Force update anytime with dedicated button
- **🎨 Smooth Animations**: Pulse effects, transitions, and loading states
- **✅ Success Notifications**: Toast messages for all actions
- **🔔 Live Indicator**: Green "LIVE" badge shows real-time status
- **⏰ Last Update Timestamp**: See exactly when data was refreshed
- **Web-Optimized Interface**: Desktop-first design for authorities and NGOs
- **Advanced Filtering**: Filter by status, date, severity, and search
- **CSV Export**: Download filtered reports for analysis
- **Timeline Tracking**: Visual report lifecycle from creation to resolution
- **Responsive Design**: Optimized for desktop (1024px+), works on tablet and mobile

### 🎨 Design System
- **Custom Design Tokens**: Centralized color palette and typography
- **Brand Colors**: 
  - Primary: `#C3D105` (Yellow-Green)
  - Accent: `#4CAF50` (Green)
  - Background: `#F8F8F5` (Light Beige)
  - Text: `#1A1A1A` (Deep Black)
- **Responsive Layout**: Works on all screen sizes

## 🗄️ Database Structure

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique, lowercase),
  password: String (hashed),
  role: 'citizen' | 'volunteer',
  createdAt: Date
}
```

See [MONGODB_INTEGRATION.md](./MONGODB_INTEGRATION.md) for detailed documentation.

## 🧪 Testing

### Test Authentication
```bash
node test-auth.js
```

### Test Credentials
**Citizen:**
- Email: `test.citizen@example.com`
- Password: `password123`

**Volunteer:**
- Email: `test.volunteer@example.com`
- Password: `password456`

## 📁 Project Structure

```
ecobhandu/
├── app/                    # Screens and routing
│   ├── login.tsx          # Entry/splash screen
│   ├── onboarding.tsx     # Role selection
│   ├── signin.tsx         # Sign in screen
│   ├── signup.tsx         # Sign up screen
│   ├── admin-dashboard.tsx # Admin panel (NEW!)
│   ├── report-issue.tsx   # Citizen report form
│   ├── volunteer-*.tsx    # Volunteer screens
│   └── (tabs)/            # Main app tabs
├── lib/                   # Core utilities
│   ├── mongodb.ts         # Database connection
│   ├── auth.ts            # Authentication logic
│   ├── api.ts             # API client
│   └── gemini.ts          # AI integration
├── constants/             # Design tokens
│   └── design-tokens.ts   # Colors, typography, spacing
├── assets/               # Images and media
│   └── images/           # Logo files
├── components/           # Reusable components
└── server.js             # Express backend
```

## 🔐 Authentication Flow

1. **Splash Screen** → Get Started
2. **Onboarding** → Select Role (Citizen/Volunteer)
3. **Sign In/Sign Up** → Authenticate with selected role
4. **Main App** → Access role-based features

## 📦 Key Dependencies

- **expo**: ~52.0.29
- **expo-router**: ~4.0.17
- **react-native**: 0.81.5
- **mongodb**: ^6.12.0
- **bcryptjs**: ^2.4.3

## 🔧 Development

### File-Based Routing
This project uses [Expo Router](https://docs.expo.dev/router/introduction/) for navigation. Add new screens by creating files in the `app/` directory.

### Design Tokens
Import design tokens for consistent styling:
```typescript
import { DESIGN_TOKENS } from '@/constants/design-tokens';

// Use colors
backgroundColor: DESIGN_TOKENS.colors.brand
```

### Database Operations
```typescript
import { createUser, authenticateUser } from '@/lib/auth';

// Create user
const user = await createUser({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'password123',
  role: 'citizen'
});

// Authenticate
const user = await authenticateUser('john@example.com', 'password123');
```

## 🎯 Roadmap

### Current Features
- ✅ Role-based authentication (Citizen/Volunteer)
- ✅ MongoDB integration
- ✅ Secure password hashing
- ✅ Form validation and error handling

### Coming Soon
- 🔄 Session management (AsyncStorage)
- 🔄 Google OAuth integration
- 🔄 Forgot password flow
- 🔄 Profile management
- 🔄 Main app features (based on role)
- 🔄 Environmental action tracking

## 🔐 Admin Dashboard Access

### Quick Access
1. **From Login Screen**: Tap "🔐 Admin Dashboard" link at bottom
2. **From Profile**: Navigate to Profile → Admin section
3. **Direct URL (Web)**: `http://localhost:8081/admin-dashboard`

### Features
- Real-time KPI metrics
- Advanced filtering and search
- CSV export functionality
- Report timeline tracking
- Quick action buttons (Escalate, Assign, Export)

### Documentation
- **Setup Guide**: See [ADMIN_SETUP_GUIDE.md](./ADMIN_SETUP_GUIDE.md)
- **Full Documentation**: See [ADMIN_DASHBOARD.md](./ADMIN_DASHBOARD.md)

## 📚 Learn More

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [React Native](https://reactnative.dev/)
- [MongoDB Node.js Driver](https://www.mongodb.com/docs/drivers/node/)

## 🤝 Contributing

This is an active development project. For detailed MongoDB integration info, see [MONGODB_INTEGRATION.md](./MONGODB_INTEGRATION.md).

## 📄 License

This project is part of the EcoBhandu environmental initiative.

