<div align="center">
  <img src="assets/images/icon.png" alt="SpendWise Logo" width="120" />
  
  # SpendWise
  **The definitive AI-powered personal finance tracker.**
  
  [![Website](https://img.shields.io/badge/Official_Website-spendwiseapp.tech-a3e635?style=for-the-badge)](https://spendwiseapp.tech)
  [![React Native](https://img.shields.io/badge/React_Native-0.81.5-0ea5e9?style=for-the-badge&logo=react)](https://reactnative.dev/)
  [![Expo](https://img.shields.io/badge/Expo-54.0.36-white?style=for-the-badge&logo=expo&logoColor=black)](https://expo.dev/)
  [![Kotlin](https://img.shields.io/badge/Kotlin-2.1.20-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white)](https://kotlinlang.org/)
  [![Firebase](https://img.shields.io/badge/Firebase-12.6.0-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
  <p align="center"><strong>Download the App on Android:</strong></p>
  <a href="https://play.google.com/store/apps/details?id=com.mearslanahmed.SpendWise">
    <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" height="60" />
  </a>
  
  **Scan receipts with AI, chat with your financial advisor, and track budgets on the go.**

  <p align="center">
    SpendWise is a next-generation personal finance application built for Android and iOS. It combines robust expense tracking with cutting-edge Artificial Intelligence to automatically scan receipts and provide personalized financial advice.
  </p>
</div>

---

## Features

- **AI Receipt Scanner:** Simply snap a photo of a receipt. The AI (powered by Google Gemini and Groq) instantly extracts the merchant, total amount, and categorizes the transaction automatically.
- **AI Financial Advisor:** Chat with a dedicated AI assistant directly in the app to get personalized budgeting advice and insights into spending habits.
- **Advanced Analytics:** Interactive charts to visualize cash flow and spending trends over time.
- **Multi-Wallet Architecture:** Segregate funds into different wallets (Checking, Savings, Crypto, Cash) and track transfers between them.
- **Budget Tracking:** Create robust monthly budgets and easily view the remaining allowance per category.
- **Subscription Management:** Keep track of active subscriptions to ensure no surprise charges.
- **Home Screen Widget:** Easily track spending and add transactions directly from your Android home screen at a glance.
- **App Lock Privacy:** Keep your financial data completely secure and private with the new built-in app lock feature.
- **Beautiful & Polished UI:** Enjoy a meticulously designed, gorgeous user interface with smooth animations and layout improvements.
- **Dynamic Theming:** Seamless support for Light and Dark modes, heavily optimized for a gorgeous dark-mode experience.
- **Push Notifications:** Configurable daily reminders to keep tracking habits consistent.
- **CSV Export:** Instantly generate and share spreadsheet reports of financial history.
- **Enterprise-Grade Security:** Fully secured by Firebase Authentication and strict Firestore security rules.

## Screenshots

| Dashboard | AI Receipt Scanner | Analytics |
| :---: | :---: | :---: |
| <img src="screenshots/05_home.jpg" width="250"> | <img src="screenshots/18_analyzing_recipt.jpg" width="250"> | <img src="screenshots/06_analytics.jpg" width="250"> |

| AI Financial Chat | Wallets | Settings |
| :---: | :---: | :---: |
| <img src="screenshots/07_ai.jpg" width="250"> | <img src="screenshots/09_wallet.jpg" width="250"> | <img src="screenshots/15_settings.jpg" width="250"> |

---

## Tech Stack

### Frontend & Mobile
- **React Native (0.76.5)** with **Expo (54.0)** for cross-platform compilation.
- **Expo Router (6.0)** for modern, file-based navigation.
- **TypeScript** for strict type-safety across the entire codebase.
- **Kotlin & Jetpack Glance (1.1.0):** Native Android module for the interactive home screen widget.
- **React Native Gifted Charts** for data visualization.

### Backend & Cloud
- **Firebase Authentication:** Handles secure user onboarding (Email/Password and Google SSO).
- **Cloud Firestore:** Real-time NoSQL database for syncing transactions across devices instantly.
- **Cloudinary:** Blazing-fast CDN for storing user avatars and highly compressed receipt images.

### Artificial Intelligence
- **Google Gemini API:** Primary intelligence engine for processing images and chat logic.
- **Groq API:** Ultra-low latency fallback system for text generation.

---





---

## Official Website & Backend API Repository
While Firebase handles database syncing and authentication, **the Artificial Intelligence features of this mobile app are powered by our custom Next.js backend API.** 

The Next.js web repository serves dual purposes:
1. It hosts the gorgeous marketing landing page at **[https://spendwiseapp.tech](https://spendwiseapp.tech)**
2. It hosts the secure backend API route (`/api/ai-receipt`) that the mobile app communicates with to process receipts through Google Gemini and Groq without exposing API keys.

You can view the source code for the Next.js backend API and website in its dedicated repository:
**[GitHub: spendwise-web](https://github.com/mearslanahmed/spendwise-web)**

## Developer & Contact

**Arslan Ahmed**
- Business & Freelance Inquiries: [arslanahmednaseem@gmail.com](mailto:arslanahmednaseem@gmail.com)
- App Support: [spendwiseoffical@gmail.com](mailto:spendwiseoffical@gmail.com)
- GitHub: [@mearslanahmed](https://github.com/mearslanahmed)

## Legal

SpendWise is a proprietary application. By downloading, accessing, or running this software, you agree to the Terms of Service and Privacy Policy.

- View the [LICENSE](LICENSE) file for distribution rights.
- The official web-hosted legal documents can be found at [spendwiseapp.tech/privacy](https://spendwiseapp.tech/privacy) and [spendwiseapp.tech/terms](https://spendwiseapp.tech/terms).
