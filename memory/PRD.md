# Ayurveda Nursing Academy — PRD

## Vision
Premium dark-mode e-learning app for Ayurvedic nursing education with multi-role access, multiple payment options, and rich content types (PDF/Word/Video/Quizzes).

## Roles
- Student (default)
- Teacher
- Admin

## Authentication
- JWT email/password (register/login)
- Multi-role registration
- Token stored in AsyncStorage (web) / SecureStore (native)

## Features (MVP)
- Course catalog (categorized, featured, search/filter)
- Course detail with curriculum, instructor, pricing
- Lesson player: PDF (Google Docs viewer), Word doc (viewer), Video (YouTube embed) via WebView/iframe
- Tinder-style swipeable MCQ quiz with reanimated gestures + haptics + scoring
- Notes (CRUD, color-coded)
- Live classes schedule
- My Learning with progress tracking + certificates (auto-issued at 100%)
- Profile with stats
- Multi-payment checkout: Razorpay (UPI/Cards/NetBanking/Wallets — INR) + Stripe (international cards — USD). MOCKED VERIFICATION for MVP.

## Tech
- Frontend: Expo SDK 54, expo-router, reanimated v4, gesture-handler, expo-image, expo-linear-gradient, expo-blur, react-native-webview, expo-haptics
- Backend: FastAPI, MongoDB (motor), bcrypt, PyJWT
- Design: Glass / Luxe DARK — deep charcoal greens (#0A0D0B) + antique gold (#C5A059)

## Future
- Real Razorpay/Stripe SDK integration (requires custom dev client)
- Emergent Google OAuth
- Live class WebRTC/video integration
- File upload for admin (currently URL-based)
- Push notifications
