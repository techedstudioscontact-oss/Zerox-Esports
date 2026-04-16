export type Role = 'user' | 'admin' | 'manager' | 'masteradmin' | 'superadmin';

export interface SupportMessage {
  id: string;
  text: string;
  senderId: string;           // uid of sender
  senderEmail: string;
  senderRole: Role;
  timestamp: number;          // Date.now()
  isRead: boolean;
  // Media attachment (image or video via Cloudinary)
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  cloudinaryPublicId?: string; // for auto-delete on resolve
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  published: boolean;
  linkUrl?: string;
}

export interface CreditRequest {
  id: string; // Document ID
  userId: string;
  userEmail: string;
  amount: number;
  requestedBy: string; // Admin UID
  requestedByName: string; // Admin Name
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected';
  processedBy?: string; // Manager UID
}

export interface SupportChat {
  id: string;                 // chatId = userId
  userId: string;
  userEmail: string;
  status: 'open' | 'resolved';
  lastMessage: string;
  lastMessageTime: number;
  unreadByAdmin: number;      // count for badge
  unreadByUser: number;
}

export interface MatchProgress {
  matchIndex: number; // 0 for single events
  timestamp: number;    // saved time in seconds
  lastWatched: number;  // Date.now()
  progress: number;     // 0.0 to 1.0
}

export type GameType = 'bgmi' | 'freefire' | 'minecraft' | 'valorant';

export interface GameProfile {
  gameId: GameType;
  inGameName?: string; // For BGMI/Free Fire/Valorant
  gameUID?: string;    // For BGMI/Free Fire
  username?: string;   // For Minecraft (GamerTag)
}

export interface User {
  uid: string;
  email: string;
  role: Role;
  displayName?: string;
  savedTournaments: string[]; // Array of Tournament IDs
  watchHistory?: string[]; // IDs of watched match VODs
  recentMatches?: { [tournamentId: string]: MatchProgress };
  upiId?: string;
  suspendedUntil?: number; // Timestamp until which the user is suspended
  coins?: number; // Gamification currency
  lastDailyReward?: string; // ISO Date string of last reward
  fcmToken?: string; // Firebase Cloud Messaging Token for Push
  oneSignalPlayerId?: string; // OneSignal Player ID for Push
  // --- Game Profile Fields ---
  phoneNumber?: string;
  whatsapp?: string;
  gameProfiles?: GameProfile[]; // Array of game profiles

  // --- Referral System ---
  referralCode?: string; // Their unique code
  referredBy?: string;   // Who referred them

  // --- Team System ---
  teamMembers?: string[]; // Array of accepted team member UIDs

  paidUser?: boolean; // Premium flag
  onboardingComplete?: boolean; // True once the user has completed the onboarding form
  showLiveBg?: boolean; // User preference for video background
}

export interface Tournament {
  id: string;
  title: string;
  description: string; // Used for "Rules and Guidelines" or synopsis
  thumbnailUrl: string;
  coverUrl?: string; // New field for Home page cover display
  tags: string[]; // Genres / Games (e.g., BGMI, Free Fire)
  videoUrl?: string; // Direct VOD/Stream link
  downloadUrl?: string; // Optional direct download link
  uploadedBy: string; // admin uid
  published: boolean;
  isPinned?: boolean; // Pinned to top of Home Carousel
  isFeatured?: boolean; // Pinned to Main Stream Scrims horizontal strip
  createdAt: number;
  contentType: 'event' | 'scrim' | 'league';
  status: 'pending' | 'published' | 'rejected' | 'upcoming' | 'ongoing' | 'completed';
  rejectionReason?: string;
  matches?: { id: string; title: string; videoUrl: string; number: number }[]; // For brackets or multi-match series
  // Intro/Outro Detection (Optional for Stream VODs)
  introStart?: number;
  introEnd?: number;
  outroStart?: number;
  outroEnd?: number;
  // Esports Meta Data
  startDate?: string;
  registrationCloseDate?: string;
  map?: string;
  teamSize?: string;
  maxSlots?: number;
  prizePool?: string;
  entryFee?: number; // Cost in coins to register
  roomId?: string; // Revealed to registered users
  roomPassword?: string; // Revealed to registered users
}

export interface PaymentIntent {
  amount: number;
  description: string;
  type: 'CONTENT_UNLOCK' | 'ADMIN_FEE';
}

declare global {
  interface Window {
    Uropay: any;
  }
}

export interface AdCampaign {
  id: string;
  title: string;
  videoUrl: string;       // External Link (Drive/Direct)
  linkUrl?: string;       // "Learn More" destination
  active: boolean;
  frequency: number;      // 1-10 priority (10 = highest)

  isSkippable: boolean;
  skipAfter?: number;     // seconds
  type: 'preroll' | 'midroll';

  startDate?: string;     // ISO Date
  endDate?: string;       // ISO Date

  views: number;
  clicks: number;
  dailyStats?: { [date: string]: { views: number; clicks: number } }; // { "2023-10-27": { views: 5, clicks: 1 } }
  createdAt: any;         // Firestore Timestamp
}

export interface AdSettings {
  globalEnabled: boolean;
  frequencyCapMinutes: number; // e.g., 15 mins
}
export interface BugReport {
  id: string;
  userId: string;
  userEmail: string;
  description: string;
  deviceInfo: string;
  createdAt: any; // Firestore Timestamp
  status: 'open' | 'resolved';
}

export interface RevenuePool {
  id: string; // Format: "YYYY-MM" (e.g., "2025-01")
  month: number; // 0-11
  year: number;
  totalRevenue: number;
  platformShare: number; // Deducted amount
  adminPool: number; // Distributable amount
  status: 'open' | 'distributed';
  createdAt?: any; // Start of month timestamp
  distributedAt?: any; // Firestore Timestamp
  processedBy?: string; // Master Admin UID
}

export interface AdminActivity {
  id: string; // Format: "UID_YYYY-MM"
  adminId: string;
  adminName: string; // Snapshot for display
  month: string; // "2025-01"
  uploadCount: number;
  totalViews: number; // Engagement metric
  isEligible: boolean; // uploadCount >= 2
  lastUpdated: any;
}

export interface PlayerInput {
  ign: string; // In-Game Name
  characterId: string; // In-Game Character ID
  appUid?: string; // App UID for team members
}

export interface Registration {
  id: string; // Document ID
  tournamentId: string;
  userId: string;
  userEmail: string;
  teamName?: string; // If applicable
  players: PlayerInput[]; // Array of player details
  contactNumber: string;
  registeredAt: number; // Timestamp
  entryFeePaid: number; // How many coins were deducted
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'credit' | 'debit';
  reason: 'add_money' | 'withdraw' | 'referral_bonus' | 'signup_bonus' | 'entry_fee' | 'reward';
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  paymentId?: string; // External payment reference
  upiId?: string; // For withdrawals
}

export interface TeamRequest {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: number; // Date.now()
}
