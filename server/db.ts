import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import {
  Contact,
  ContactGroup,
  ConsentRecord,
  Message,
  Conversation,
  MessageTemplate,
  Campaign,
  AutoReplyRule,
  KeywordAutomation,
  FollowUpSequence,
  SmartPacingConfig,
  MessageQueueItem,
  WhatsAppConnectionInfo,
  TeamMember,
  AuditLog,
  BackupRecord,
  PersistentPacingState,
  MessageStatus,
} from '../src/types/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

export interface DatabaseSchema {
  contacts: Contact[];
  groups: ContactGroup[];
  consentRecords: ConsentRecord[];
  messages: Message[];
  conversations: Conversation[];
  templates: MessageTemplate[];
  campaigns: Campaign[];
  autoReplies: AutoReplyRule[];
  keywordAutomations: KeywordAutomation[];
  followUpSequences: FollowUpSequence[];
  pacingConfig: SmartPacingConfig;
  pacingState: PersistentPacingState;
  messageQueue: MessageQueueItem[];
  connectionInfo: WhatsAppConnectionInfo;
  teamMembers: TeamMember[];
  auditLogs: AuditLog[];
  backups: BackupRecord[];
  suppressionList?: string[];
  settings: {
    businessName: string;
    businessType: string;
    location: string;
    contactNumber: string;
    gstin: string;
    address: string;
    workingHoursStart: string;
    workingHoursEnd: string;
    optOutKeywords: string[];
    isDemoMode: boolean;
  };
}

export const OPT_OUT_KEYWORDS = [
  'STOP',
  'UNSUBSCRIBE',
  'CANCEL',
  'END',
  'QUIT',
  'REMOVE',
];

export function normalizePhoneDigits(phone: string): string {
  return (phone || '').replace(/\D/g, '');
}

export function arePhonesMatching(phone1: string, phone2: string): boolean {
  const d1 = normalizePhoneDigits(phone1);
  const d2 = normalizePhoneDigits(phone2);
  if (!d1 || !d2) return false;
  if (d1 === d2) return true;
  if (d1.length >= 10 && d2.length >= 10) {
    return d1.slice(-10) === d2.slice(-10);
  }
  return false;
}

const DEFAULT_SETTINGS = {
  businessName: 'VIKAS AUTOMOBILES',
  businessType: 'HP LUBE DISTRIBUTOR & C&F AGENT',
  location: 'Satna, Madhya Pradesh, India',
  contactNumber: '9827003016',
  gstin: '23AABCV1234F1Z9',
  address: 'Opp. Transport Nagar, Rewa Road / Semariya Chowk, Satna (M.P.) 485001',
  workingHoursStart: '09:00',
  workingHoursEnd: '20:00',
  optOutKeywords: ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'REMOVE', 'STOP ALL', 'OPT OUT', 'NO MORE'],
  isDemoMode: true,
};

export function getInitialSeedData(): DatabaseSchema {
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();
  const threeDaysAgo = new Date(Date.now() - 259200000).toISOString();

  const contacts: Contact[] = [
    {
      id: 'c-1',
      name: 'Ramesh Patel',
      phone: '+919826112233',
      businessName: 'Patel Tractor & Auto Garage',
      city: 'Satna',
      category: 'Workshops',
      productInterest: 'HP Milcy Turbo 15W-40, HP Gear Oil EP 90',
      notes: 'Key agricultural workshop near Maihar Bypass. Needs weekly 50L buckets.',
      tags: ['VIP', 'Tractor Specialist', 'Mechanic Reward Club'],
      consentStatus: 'OPTED_IN',
      consentDate: twoDaysAgo,
      consentSource: 'In-Store Physical Job Card #481',
      consentEvidence: 'Signed job card counterfoil kept at Satna office ledger',
      consentWordingVersion: 'v1.2 - 2026 Statutory Compliance',
      lastInteraction: yesterday,
      createdAt: threeDaysAgo,
      isDemo: true,
    },
    {
      id: 'c-2',
      name: 'Sunil Verma',
      phone: '+919827223344',
      businessName: 'Verma Lube & Spares Store',
      city: 'Rewa',
      category: 'Retailers',
      productInterest: 'HP Racer 4 20W-40, HP Neo Synth 5W-30',
      notes: 'High volume 2-wheeler counter retailer. Prompt payment on delivery.',
      tags: ['Retail Counter', 'Prompt Pay', 'Rewa Dealer'],
      consentStatus: 'OPTED_IN',
      consentDate: threeDaysAgo,
      consentSource: 'Website Form',
      consentEvidence: 'Online opt-in IP 103.21.124.9 verification log',
      consentWordingVersion: 'v1.2 - 2026 Statutory Compliance',
      lastInteraction: now,
      createdAt: threeDaysAgo,
      isDemo: true,
    },
    {
      id: 'c-3',
      name: 'Anand Kushwaha',
      phone: '+919425334455',
      businessName: 'Kushwaha Earthmovers & Tipper Fleet',
      city: 'Satna',
      category: 'Industrial Customers',
      productInterest: 'HP Enklo 68 Hydraulic Oil, HP Milcy Turbo',
      notes: 'Supplies crushed limestone to Birla / Prism Cement. 12 heavy tippers.',
      tags: ['Fleet Owner', 'Industrial', 'High Volume'],
      consentStatus: 'OPTED_IN',
      consentDate: twoDaysAgo,
      consentSource: 'Customer Registration Form',
      consentEvidence: 'Signed C&F credit account agreement #2026/04',
      consentWordingVersion: 'v1.2 - 2026 Statutory Compliance',
      lastInteraction: yesterday,
      createdAt: threeDaysAgo,
      isDemo: true,
    },
    {
      id: 'c-4',
      name: 'Gopal Soni',
      phone: '+919827445566',
      businessName: 'Krishna Two Wheeler Service',
      city: 'Maihar',
      category: 'Mechanics',
      productInterest: 'HP Racer 4 20W-40, HP Koolgard Coolant',
      notes: 'Active mechanic in Maihar town. Interested in coupon reward scheme.',
      tags: ['Mechanic Club', 'Coupon Scheme'],
      consentStatus: 'PENDING',
      consentDate: undefined,
      consentSource: 'Imported from Counter Visit',
      consentEvidence: 'Sent opt-in request on Day 0, pending confirmation',
      consentWordingVersion: 'v1.2 - 2026 Statutory Compliance',
      lastInteraction: yesterday,
      createdAt: yesterday,
      isDemo: true,
    },
    {
      id: 'c-5',
      name: 'Deepak Agrawal',
      phone: '+919425556677',
      businessName: 'Agrawal Automobiles & Lube Agency',
      city: 'Nagod',
      category: 'Automobile Dealers',
      productInterest: 'Full HP Automotive Lubricants Range',
      notes: 'Sub-distributor inquiry for Nagod tehsil.',
      tags: ['Dealership Enquiry', 'Sub-Dealer'],
      consentStatus: 'OPTED_IN',
      consentDate: yesterday,
      consentSource: 'In-Bound WhatsApp Opt-in',
      consentEvidence: 'Incoming message explicitly stating "I agree to receive HP lube updates"',
      consentWordingVersion: 'v1.2 - 2026 Statutory Compliance',
      lastInteraction: now,
      createdAt: yesterday,
      isDemo: true,
    },
    {
      id: 'c-6',
      name: 'Mahesh Vishwakarma',
      phone: '+919827667788',
      businessName: 'Vishwakarma Agro Works',
      city: 'Amarpatan',
      category: 'Retailers',
      productInterest: 'HP Laal Ghoda, HP Grease MP3',
      notes: 'Imported from Satna Trade Directory. Promotional messaging strictly blocked.',
      tags: ['Agro Retailer'],
      consentStatus: 'NOT_GIVEN',
      consentSource: 'Imported Directory',
      consentEvidence: 'No consent record exists. Must not send marketing.',
      lastInteraction: threeDaysAgo,
      createdAt: threeDaysAgo,
      isDemo: true,
    },
    {
      id: 'c-7',
      name: 'Pramod Tiwari',
      phone: '+919827778899',
      businessName: 'Tiwari Garage',
      city: 'Satna',
      category: 'Mechanics',
      productInterest: 'HP Racer 4',
      notes: 'Customer opted out by replying STOP.',
      tags: ['Suppression List', 'Opted Out'],
      consentStatus: 'OPTED_OUT',
      consentDate: threeDaysAgo,
      consentSource: 'WhatsApp Inbound Message',
      consentEvidence: 'Customer replied STOP on Nov 02 2026. Permanent suppression.',
      lastInteraction: twoDaysAgo,
      createdAt: threeDaysAgo,
      isDemo: true,
    },
    {
      id: 'c-8',
      name: 'Rajesh Gupta',
      phone: '+919425889900',
      businessName: 'Gupta Auto Spares',
      city: 'Satna',
      category: 'Distributors',
      productInterest: 'Bulk 210L HP Milcy Turbo Barrels',
      notes: 'Wholesale distributor covering Panna & Nagod sectors.',
      tags: ['Distributor', 'Bulk Barrel'],
      consentStatus: 'OPTED_IN',
      consentDate: threeDaysAgo,
      consentSource: 'Physical C&F Agreement',
      consentEvidence: 'Annual Distributor Consent Annexure signed 2026',
      consentWordingVersion: 'v1.2 - 2026 Statutory Compliance',
      lastInteraction: yesterday,
      createdAt: threeDaysAgo,
      isDemo: true,
    },
  ];

  const consentRecords: ConsentRecord[] = [
    {
      id: 'cr-1',
      contactId: 'c-1',
      customerName: 'Ramesh Patel',
      phone: '+919826112233',
      consentStatus: 'OPTED_IN',
      consentDate: twoDaysAgo,
      consentSource: 'In-Store Physical Job Card #481',
      consentEvidence: 'Signed job card counterfoil kept at Satna office ledger',
      consentWordingVersion: 'v1.2 - 2026 Statutory Compliance',
      permissionCategories: ['Promotional Offers', 'Price List Updates', 'Scheme Announcements'],
    },
    {
      id: 'cr-2',
      contactId: 'c-2',
      customerName: 'Sunil Verma',
      phone: '+919827223344',
      consentStatus: 'OPTED_IN',
      consentDate: threeDaysAgo,
      consentSource: 'Website Form',
      consentEvidence: 'Online opt-in IP 103.21.124.9 verification log',
      consentWordingVersion: 'v1.2 - 2026 Statutory Compliance',
      permissionCategories: ['Promotional Offers', 'New Product Launch'],
    },
    {
      id: 'cr-3',
      contactId: 'c-3',
      customerName: 'Anand Kushwaha',
      phone: '+919425334455',
      consentStatus: 'OPTED_IN',
      consentDate: twoDaysAgo,
      consentSource: 'Customer Registration Form',
      consentEvidence: 'Signed C&F credit account agreement #2026/04',
      consentWordingVersion: 'v1.2 - 2026 Statutory Compliance',
      permissionCategories: ['Bulk Rate Notifications', 'Payment Reminders', 'Industrial Specs'],
    },
    {
      id: 'cr-7',
      contactId: 'c-7',
      customerName: 'Pramod Tiwari',
      phone: '+919827778899',
      consentStatus: 'OPTED_OUT',
      consentDate: threeDaysAgo,
      consentSource: 'WhatsApp Inbound Message',
      consentEvidence: 'Inbound message containing "STOP". Suppressed permanently.',
      consentWordingVersion: 'v1.2 - 2026 Statutory Compliance',
      permissionCategories: [],
      optOutDate: twoDaysAgo,
      optOutSource: 'Inbound WhatsApp STOP trigger',
    },
  ];

  const groups: ContactGroup[] = [
    {
      id: 'g-1',
      name: 'All Retailers',
      description: 'Retail lubricant shops and spare parts dealers in Satna, Rewa & Maihar',
      contactIds: ['c-2', 'c-6'],
      createdAt: threeDaysAgo,
    },
    {
      id: 'g-2',
      name: 'All Mechanics & Garages',
      description: 'Automobile, tractor, and bike mechanics enrolled in HP Mechanic Scheme',
      contactIds: ['c-1', 'c-4', 'c-7'],
      createdAt: threeDaysAgo,
    },
    {
      id: 'g-3',
      name: 'Industrial & Fleet Owners',
      description: 'Limestone transporters, cement plant contractors, and earthmovers',
      contactIds: ['c-3'],
      createdAt: threeDaysAgo,
    },
    {
      id: 'g-4',
      name: 'Opted-In Verified List',
      description: 'Contacts with verified explicit promotional consent',
      contactIds: ['c-1', 'c-2', 'c-3', 'c-5', 'c-8'],
      createdAt: threeDaysAgo,
    },
  ];

  const templates: MessageTemplate[] = [
    {
      id: 't-1',
      name: 'HP Milcy Turbo Stock Availability',
      category: 'Product Availability',
      body: 'Dear {{name}}, fresh stock of HP Milcy Turbo 15W-40 (Heavy Duty Diesel Engine Oil) has arrived at Vikas Automobiles Satna warehouse. Special bundle discounts available on 20L and 50L packs for {{business}}. Reply ORDER to book your dispatch. - Vikas Automobiles (Ph: 9827003016)',
      variables: ['name', 'business'],
      createdAt: threeDaysAgo,
      lastUsed: yesterday,
    },
    {
      id: 't-2',
      name: 'HP Racer 4 Bike Oil Promotion',
      category: 'Mechanic Promotions',
      body: 'Namaste {{name}} ji, exclusive seasonal cash coupon coupons are now active on HP Racer 4 20W-40 for mechanics in {{city}}! Get instant scratch reward on every carton. Visit Vikas Automobiles or call 9827003016.',
      variables: ['name', 'city'],
      createdAt: threeDaysAgo,
    },
    {
      id: 't-3',
      name: 'Payment Reminder & Invoice Dispatch',
      category: 'Payment Reminders',
      body: 'Dear {{name}}, greetings from Vikas Automobiles, Satna. Invoice for your recent HP Lubricants supply to {{business}} is ready. Kindly verify payment details with our accounts desk at 9827003016. Thank you for your continued partnership.',
      variables: ['name', 'business'],
      createdAt: threeDaysAgo,
    },
    {
      id: 't-4',
      name: 'New Product Launch - HP Neo Synth',
      category: 'New Lubricant Launch',
      body: 'Introducing HP Neo Synth 5W-30 Fully Synthetic Engine Oil for modern BS6 cars! Available now at Vikas Automobiles Satna. Inquire today for introductory dealer margins for {{business}} in {{city}}. Contact: 9827003016.',
      variables: ['name', 'business', 'city'],
      createdAt: twoDaysAgo,
    },
    {
      id: 't-5',
      name: 'Dealership & Sub-Stockist Scheme',
      category: 'Dealer Offers',
      body: 'Dear {{name}}, Vikas Automobiles (HP Lube C&F Agent, Satna) is announcing quarterly incentive schemes for automobile dealers in {{city}}. Reply DEALER to receive the scheme booklet directly on WhatsApp.',
      variables: ['name', 'city'],
      createdAt: twoDaysAgo,
    },
  ];

  const autoReplies: AutoReplyRule[] = [
    {
      id: 'ar-1',
      title: 'General Greeting (HI / HELLO)',
      triggerKeyword: 'HI',
      matchType: 'EXACT',
      response: 'Hello! Welcome to Vikas Automobiles, Satna. We are authorized HP Lube Distributor & C&F Agent. How can we help you today? Reply PRICE for rates, CATALOGUE for product list, or LOCATION for warehouse address.',
      priority: 1,
      isAwayOnly: false,
      enabled: true,
    },
    {
      id: 'ar-2',
      title: 'Price Inquiry (PRICE / RATE)',
      triggerKeyword: 'PRICE',
      matchType: 'CONTAINS',
      response: 'Please tell us which HP lubricant or product you require (e.g., HP Milcy Turbo 15W-40, HP Racer 4, HP Enklo 68, or Grease MP3) along with pack size so that our sales team can share the current wholesale price list.',
      priority: 2,
      isAwayOnly: false,
      enabled: true,
    },
    {
      id: 'ar-3',
      title: 'Product Catalogue (CATALOGUE)',
      triggerKeyword: 'CATALOGUE',
      matchType: 'CONTAINS',
      response: 'Thank you for your interest. We stock complete HP Automotive & Industrial lubricants: 1) Heavy Commercial & Tractor (Milcy Turbo), 2) Two-Wheeler (Racer 4), 3) Passenger Car (Neo Synth), 4) Industrial Hydraulics (Enklo 68). Our team will share the PDF brochure shortly.',
      priority: 3,
      isAwayOnly: false,
      enabled: true,
    },
    {
      id: 'ar-4',
      title: 'Dealership Enquiry (DEALER)',
      triggerKeyword: 'DEALER',
      matchType: 'CONTAINS',
      response: 'Thank you for your dealership enquiry with Vikas Automobiles. Please share your business name, GST number, and shop location in MP. Our distributor manager will get in touch directly at 9827003016.',
      priority: 4,
      isAwayOnly: false,
      enabled: true,
    },
    {
      id: 'ar-5',
      title: 'Office & Warehouse Location (LOCATION)',
      triggerKeyword: 'LOCATION',
      matchType: 'CONTAINS',
      response: 'Vikas Automobiles, HP Lube Distributor & C&F Agent, Opp. Transport Nagar / Maihar Bypass, Rewa Road, Satna, Madhya Pradesh 485001. For dispatch inquiries contact: 9827003016.',
      priority: 5,
      isAwayOnly: false,
      enabled: true,
    },
    {
      id: 'ar-6',
      title: 'Order Booking (ORDER)',
      triggerKeyword: 'ORDER',
      matchType: 'CONTAINS',
      response: 'Thank you for placing an order with Vikas Automobiles. Please reply with: 1) Product Name, 2) Pack Size & Quantity (e.g. 5x 20L Buckets), 3) Delivery City / Shop Name. We will confirm dispatch schedule.',
      priority: 6,
      isAwayOnly: false,
      enabled: true,
    },
    {
      id: 'ar-7',
      title: 'Customer Support (SUPPORT)',
      triggerKeyword: 'SUPPORT',
      matchType: 'CONTAINS',
      response: 'Thank you for contacting Vikas Automobiles Support. Your inquiry has been logged and assigned to our Satna office team. For urgent matters, please call 9827003016.',
      priority: 7,
      isAwayOnly: false,
      enabled: true,
    },
  ];

  const keywordAutomations: KeywordAutomation[] = [
    {
      id: 'ka-1',
      title: 'Auto-tag Price Inquiries',
      keyword: 'PRICE',
      matchType: 'CASE_INSENSITIVE',
      actions: {
        sendReply: 'Price inquiry received. Our sales desk is compiling the current HP wholesale tariff.',
        addTag: 'PRICE_ENQUIRY',
        notifyAdmin: true,
      },
      enabled: true,
      triggerCount: 14,
    },
    {
      id: 'ka-2',
      title: 'Dealership Lead Routing',
      keyword: 'DEALERSHIP',
      matchType: 'PARTIAL',
      actions: {
        sendReply: 'Thank you for your interest in becoming an authorized HP Lube retailer.',
        addTag: 'DEALERSHIP_LEAD',
        addToGroup: 'g-1',
        assignTo: 'u-1',
        notifyAdmin: true,
      },
      enabled: true,
      triggerCount: 8,
    },
    {
      id: 'ka-3',
      title: 'Mechanic Scheme Tagging',
      keyword: 'COUPON',
      matchType: 'CASE_INSENSITIVE',
      actions: {
        sendReply: 'Please send photo of your HP Racer 4 QR scratch coupon for redemption.',
        addTag: 'MECHANIC_REWARD',
        addToGroup: 'g-2',
      },
      enabled: true,
      triggerCount: 22,
    },
  ];

  const followUpSequences: FollowUpSequence[] = [
    {
      id: 'fus-1',
      name: 'New Retailer Onboarding Sequence',
      targetCategory: 'Retailers',
      enabled: true,
      steps: [
        {
          stepNumber: 1,
          delayDays: 0,
          delayHours: 1,
          title: 'Immediate Welcome & Product Guide',
          messageText: 'Welcome to Vikas Automobiles network! We are your official HP Lube C&F partner in Satna.',
        },
        {
          stepNumber: 2,
          delayDays: 1,
          delayHours: 24,
          title: 'Stock Availability & Minimum Order Info',
          messageText: 'Did you get a chance to view our HP Milcy Turbo & Racer 4 wholesale price list? Let us know if you need assistance.',
        },
        {
          stepNumber: 3,
          delayDays: 3,
          delayHours: 72,
          title: 'Discount Scheme Check-in',
          messageText: 'Special introductory 3% cash rebate is active this month for new billing accounts. Call 9827003016.',
        },
        {
          stepNumber: 4,
          delayDays: 7,
          delayHours: 168,
          title: 'Final Follow-up & Sales Desk Call',
          messageText: 'Checking in from Vikas Automobiles Satna. Would you like our sales representative to visit your shop this week?',
        },
      ],
    },
  ];

  const campaigns: Campaign[] = [
    {
      id: 'cmp-1',
      name: 'Diwali HP Milcy Turbo Pre-Booking Scheme',
      targetGroupIds: ['g-4'],
      targetContactIds: ['c-1', 'c-2', 'c-3'],
      templateId: 't-1',
      customMessage: '',
      status: 'COMPLETED',
      createdAt: twoDaysAgo,
      stats: {
        totalTargeted: 5,
        eligibleOptedIn: 3,
        pendingConsentBlocked: 1,
        optedOutBlocked: 1,
        invalidOrDuplicateBlocked: 0,
        sent: 3,
        delivered: 3,
        read: 2,
        failed: 0,
      },
    },
  ];

  const conversations: Conversation[] = [
    {
      id: 'conv-1',
      contactId: 'c-1',
      customerName: 'Ramesh Patel',
      phone: '+919826112233',
      businessName: 'Patel Tractor & Auto Garage',
      category: 'Workshops',
      lastMessage: 'Ji, please send 2 buckets of Milcy Turbo 15W-40 tomorrow.',
      lastTimestamp: yesterday,
      unreadCount: 1,
      resolved: false,
      assignedTo: 'u-1',
      consentStatus: 'OPTED_IN',
    },
    {
      id: 'conv-2',
      contactId: 'c-2',
      customerName: 'Sunil Verma',
      phone: '+919827223344',
      businessName: 'Verma Lube & Spares Store',
      category: 'Retailers',
      lastMessage: 'Payment of Rs. 42,500 transferred via NEFT. Please check.',
      lastTimestamp: now,
      unreadCount: 0,
      resolved: true,
      assignedTo: 'u-2',
      consentStatus: 'OPTED_IN',
    },
    {
      id: 'conv-5',
      contactId: 'c-5',
      customerName: 'Deepak Agrawal',
      phone: '+919425556677',
      businessName: 'Agrawal Automobiles & Lube Agency',
      category: 'Automobile Dealers',
      lastMessage: 'PRICE for HP Racer 4 1L pack carton',
      lastTimestamp: yesterday,
      unreadCount: 0,
      resolved: false,
      assignedTo: 'u-1',
      consentStatus: 'OPTED_IN',
    },
  ];

  const messages: Message[] = [
    {
      id: 'm-1',
      conversationId: 'conv-1',
      contactId: 'c-1',
      customerName: 'Ramesh Patel',
      phone: '+919826112233',
      direction: 'outbound',
      type: 'template',
      content: 'Dear Ramesh Patel, fresh stock of HP Milcy Turbo 15W-40 has arrived at Vikas Automobiles Satna warehouse. Special bundle discounts available on 20L and 50L packs for Patel Tractor & Auto Garage. Reply ORDER to book your dispatch. - Vikas Automobiles (Ph: 9827003016)',
      timestamp: twoDaysAgo,
      status: 'READ',
      category: 'promotional',
      campaignId: 'cmp-1',
      isDemo: true,
    },
    {
      id: 'm-2',
      conversationId: 'conv-1',
      contactId: 'c-1',
      customerName: 'Ramesh Patel',
      phone: '+919826112233',
      direction: 'inbound',
      type: 'text',
      content: 'Ji, please send 2 buckets of Milcy Turbo 15W-40 tomorrow.',
      timestamp: yesterday,
      status: 'DELIVERED',
      category: 'support',
      isDemo: true,
    },
    {
      id: 'm-3',
      conversationId: 'conv-2',
      contactId: 'c-2',
      customerName: 'Sunil Verma',
      phone: '+919827223344',
      direction: 'outbound',
      type: 'text',
      content: 'Dear Sunil ji, your dispatch order #VA-8821 for 4 cartons HP Racer 4 has been sent via Satna-Rewa transport service. Bill copy enclosed.',
      timestamp: yesterday,
      status: 'READ',
      category: 'transactional',
      isDemo: true,
    },
    {
      id: 'm-4',
      conversationId: 'conv-2',
      contactId: 'c-2',
      customerName: 'Sunil Verma',
      phone: '+919827223344',
      direction: 'inbound',
      type: 'text',
      content: 'Payment of Rs. 42,500 transferred via NEFT. Please check.',
      timestamp: now,
      status: 'READ',
      category: 'transactional',
      isDemo: true,
    },
    {
      id: 'm-5',
      conversationId: 'conv-5',
      contactId: 'c-5',
      customerName: 'Deepak Agrawal',
      phone: '+919425556677',
      direction: 'inbound',
      type: 'text',
      content: 'PRICE for HP Racer 4 1L pack carton',
      timestamp: yesterday,
      status: 'READ',
      category: 'support',
      isDemo: true,
    },
    {
      id: 'm-6',
      conversationId: 'conv-5',
      contactId: 'c-5',
      customerName: 'Deepak Agrawal',
      phone: '+919425556677',
      direction: 'outbound',
      type: 'text',
      content: 'Please tell us which HP lubricant or product you require (e.g., HP Milcy Turbo 15W-40, HP Racer 4, HP Enklo 68, or Grease MP3) along with pack size so that our sales team can share the current wholesale price list.',
      timestamp: yesterday,
      status: 'DELIVERED',
      category: 'auto_reply',
      isDemo: true,
    },
  ];

  // Passwords hashed using bcrypt (cost factor 10)
  // admin123, manager123, employee123
  const teamMembers: TeamMember[] = [
    {
      id: 'u-1',
      name: 'Dhairya Khandelwal',
      email: 'dhairya@vikasautomobiles.com',
      role: 'ADMIN',
      phone: '9827003016',
      avatarColor: 'bg-blue-600',
      active: true,
      passwordHash: bcrypt.hashSync('admin123', 10),
    },
    {
      id: 'u-2',
      name: 'Ramesh Kumar',
      email: 'sales@vikasautomobiles.com',
      role: 'MANAGER',
      phone: '9826198765',
      avatarColor: 'bg-emerald-600',
      active: true,
      passwordHash: bcrypt.hashSync('manager123', 10),
    },
    {
      id: 'u-3',
      name: 'Vikas Staff Assistant',
      email: 'support@vikasautomobiles.com',
      role: 'EMPLOYEE',
      phone: '9425012345',
      avatarColor: 'bg-indigo-600',
      active: true,
      passwordHash: bcrypt.hashSync('employee123', 10),
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'log-1',
      timestamp: threeDaysAgo,
      userName: 'Dhairya Khandelwal',
      userRole: 'ADMIN',
      action: 'SYSTEM_INITIALIZATION',
      details: 'Vikas Message Automator initialized for Vikas Automobiles Satna',
    },
    {
      id: 'log-2',
      timestamp: twoDaysAgo,
      userName: 'Dhairya Khandelwal',
      userRole: 'ADMIN',
      action: 'CONSENT_RECORD_VERIFIED',
      details: 'Recorded physical job card consent for Ramesh Patel (+919826112233)',
    },
    {
      id: 'log-3',
      timestamp: yesterday,
      userName: 'SYSTEM_AUTOMATION',
      userRole: 'ADMIN',
      action: 'AUTOMATIC_OPT_OUT',
      details: 'Customer Pramod Tiwari (+919827778899) sent STOP. Added to permanent suppression list.',
    },
  ];

  const pacingConfig: SmartPacingConfig = {
    mode: 'AUTO',
    minIntervalSeconds: 12,
    batchSize: 10,
    pauseBetweenBatchesMinutes: 3,
    dailyCampaignCap: 150,
    workingHoursStart: '09:00',
    workingHoursEnd: '20:00',
    autoCalculatedInterval: 14,
    reasonForAdjustment: 'Dynamic jitter configured for optimal message pacing and local queue regulation.',
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const pacingState: PersistentPacingState = {
    lastMessageSentAt: null,
    batchStartedAt: null,
    batchCompletedAt: null,
    nextEligibleSendAt: null,
    dailyCount: 0,
    dailyCounterDate: todayStr,
    currentBatchCount: 0,
    workerLock: null,
  };

  const connectionInfo: WhatsAppConnectionInfo = {
    state: 'DISCONNECTED',
    qrCodeDataUrl: null,
    linkedNumber: null,
    linkedName: null,
    lastConnectedTime: null,
    lastSyncTime: null,
    errorMessage: null,
    adapterMode: 'LOCAL_BRIDGE',
    disclaimerAccepted: true,
  };

  return {
    contacts,
    groups,
    consentRecords,
    messages,
    conversations,
    templates,
    campaigns,
    autoReplies,
    keywordAutomations,
    followUpSequences,
    pacingConfig,
    pacingState,
    messageQueue: [],
    connectionInfo,
    teamMembers,
    auditLogs,
    backups: [],
    suppressionList: [],
    settings: DEFAULT_SETTINGS,
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDirectoryExists();
    this.data = this.loadDatabase();
  }

  private ensureDirectoryExists() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadDatabase(): DatabaseSchema {
    const initial = getInitialSeedData();
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        const merged: DatabaseSchema = { ...initial, ...parsed };

        // Ensure pacingState exists
        if (!merged.pacingState) {
          merged.pacingState = initial.pacingState;
        }

        // Ensure suppressionList exists
        if (!merged.suppressionList || !Array.isArray(merged.suppressionList)) {
          merged.suppressionList = [];
        }

        // Ensure teamMembers have password hashes
        merged.teamMembers = merged.teamMembers.map((m) => {
          if (!m.passwordHash) {
            const defaultPassword = m.role === 'ADMIN' ? 'admin123' : m.role === 'MANAGER' ? 'manager123' : 'employee123';
            return { ...m, passwordHash: bcrypt.hashSync(defaultPassword, 10) };
          }
          return m;
        });

        return merged;
      }
    } catch (err) {
      console.error('Error reading database file, loading default seed data:', err);
    }
    this.saveDatabase(initial);
    return initial;
  }

  public saveDatabase(data?: DatabaseSchema) {
    if (data) this.data = data;
    try {
      this.ensureDirectoryExists();
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write to database file:', err);
    }
  }

  public getData(): DatabaseSchema {
    return this.data;
  }

  public resetToDemo(): DatabaseSchema {
    this.data = getInitialSeedData();
    this.saveDatabase();
    return this.data;
  }

  // Contact operations
  public getContacts(): Contact[] {
    return this.data.contacts;
  }

  public getContactById(id: string): Contact | undefined {
    return this.data.contacts.find((c) => c.id === id);
  }

  public getContactByPhone(phone: string): Contact | undefined {
    if (!phone) return undefined;
    return this.data.contacts.find((c) => arePhonesMatching(c.phone, phone));
  }

  public createContact(contactData: Omit<Contact, 'id' | 'createdAt'>): Contact {
    const id = 'c-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newContact: Contact = {
      ...contactData,
      id,
      createdAt: new Date().toISOString(),
    };

    // If explicit consent is provided at creation, create consent record
    if (newContact.consentStatus === 'OPTED_IN') {
      this.data.consentRecords.push({
        id: 'cr-' + Date.now(),
        contactId: id,
        customerName: newContact.name,
        phone: newContact.phone,
        consentStatus: 'OPTED_IN',
        consentDate: newContact.consentDate || new Date().toISOString(),
        consentSource: newContact.consentSource || 'Direct Entry',
        consentEvidence: newContact.consentEvidence || 'Manual Administrative Verification',
        consentWordingVersion: newContact.consentWordingVersion || 'v1.2 - 2026 Statutory Compliance',
        permissionCategories: ['Promotional Offers', 'Price List Updates'],
      });
    }

    this.data.contacts.push(newContact);
    this.saveDatabase();
    return newContact;
  }

  public updateContact(id: string, updates: Partial<Contact>): Contact | null {
    const index = this.data.contacts.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const oldContact = this.data.contacts[index];
    const updated = { ...oldContact, ...updates };
    this.data.contacts[index] = updated;

    // If consent status changed to OPTED_OUT
    if (updates.consentStatus === 'OPTED_OUT' && oldContact.consentStatus !== 'OPTED_OUT') {
      const now = new Date().toISOString();
      const source = updates.consentSource || 'Manual Administrative Opt-Out';
      this.data.consentRecords.push({
        id: 'cr-' + Date.now(),
        contactId: id,
        customerName: updated.name,
        phone: updated.phone,
        consentStatus: 'OPTED_OUT',
        consentDate: now,
        consentSource: source,
        consentEvidence: updates.consentEvidence || 'User/Admin requested suppression',
        consentWordingVersion: 'v1.2 - 2026 Statutory Compliance',
        permissionCategories: [],
        optOutDate: now,
        optOutSource: source,
      });

      // Add to suppression list
      if (!this.data.suppressionList) this.data.suppressionList = [];
      const digits = normalizePhoneDigits(updated.phone);
      if (digits && !this.data.suppressionList.includes(digits)) this.data.suppressionList.push(digits);

      // Cancel pending queue items for this contact
      this.cancelPendingQueueForContact(id, updated.phone);
    }

    this.saveDatabase();
    return updated;
  }

  public deleteContact(id: string): boolean {
    const initialLen = this.data.contacts.length;
    const contact = this.data.contacts.find((c) => c.id === id);
    this.data.contacts = this.data.contacts.filter((c) => c.id !== id);
    this.data.groups.forEach((g) => {
      g.contactIds = g.contactIds.filter((cid) => cid !== id);
    });
    this.cancelPendingQueueForContact(id, contact?.phone);
    this.saveDatabase();
    return this.data.contacts.length < initialLen;
  }

  public cancelPendingQueueForContact(contactId?: string, phone?: string): number {
    let cancelledCount = 0;
    this.data.messageQueue = this.data.messageQueue.map((item) => {
      const matchContact = Boolean(contactId && item.contactId === contactId);
      const matchPhone = Boolean(phone && arePhonesMatching(item.phone, phone));

      if ((matchContact || matchPhone) && (item.status === 'PENDING' || item.status === 'SCHEDULED' || item.status === 'PROCESSING')) {
        cancelledCount++;
        return {
          ...item,
          status: 'CANCELLED' as MessageStatus,
          failureReason: 'Cancelled: Contact opted out from promotional messaging (inbound opt-out received)',
        };
      }
      return item;
    });
    return cancelledCount;
  }

  // Consent enforcement & Opt-out engine (8-step comprehensive handler)
  public handleCustomerOptOut(
    phone: string,
    source: string = 'Inbound WhatsApp keyword',
    customerName?: string
  ): { success: boolean; contact?: Contact; cancelledCount: number; timestamp: string } {
    // 1. Identify the customer
    const contact = this.getContactByPhone(phone);
    const resolvedName = contact?.name || customerName || 'Valued Customer';
    const now = new Date().toISOString();
    const cleanDigits = normalizePhoneDigits(phone);
    const last10 = cleanDigits.slice(-10);

    // 2. Immediately mark the customer OPTED_OUT
    if (contact) {
      contact.consentStatus = 'OPTED_OUT';
      contact.consentDate = now;
      contact.consentSource = source;
      contact.notes = `${contact.notes || ''} [AUTO OPT-OUT via ${source} at ${now}]`.trim();
    }

    // 3. Record timestamp and source in verifiable consent audit records
    this.data.consentRecords.push({
      id: 'cr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      contactId: contact ? contact.id : 'unregistered',
      customerName: resolvedName,
      phone: contact ? contact.phone : phone,
      consentStatus: 'OPTED_OUT',
      consentDate: now,
      consentSource: source,
      consentEvidence: `Received opt-out trigger from customer (${source}) at ${now}`,
      consentWordingVersion: 'v1.2 - 2026 Statutory Compliance',
      permissionCategories: [],
      optOutDate: now,
      optOutSource: source,
    });

    // 4. Add the number to the global suppression list
    if (!this.data.suppressionList) {
      this.data.suppressionList = [];
    }
    if (cleanDigits && !this.data.suppressionList.includes(cleanDigits)) {
      this.data.suppressionList.push(cleanDigits);
    }
    if (last10.length === 10 && !this.data.suppressionList.includes(last10)) {
      this.data.suppressionList.push(last10);
    }
    if (contact && contact.phone) {
      const contactDigits = normalizePhoneDigits(contact.phone);
      if (contactDigits && !this.data.suppressionList.includes(contactDigits)) {
        this.data.suppressionList.push(contactDigits);
      }
    }

    // 5. Cancel all pending promotional messages immediately
    const cancelledCount = this.cancelPendingQueueForContact(contact?.id, phone);

    // 6. Prevent future promotional dispatch: Enforced via isSuppressed & consentStatus check

    // 7. Log the action in Audit Log
    this.addAuditLog(
      'SYSTEM_OPT_OUT_ENGINE',
      'ADMIN',
      'CUSTOMER_OPTED_OUT',
      `Customer ${resolvedName} (${phone}) opted out via ${source}. Marked OPTED_OUT, added to global suppression list, cancelled ${cancelledCount} pending queue items.`
    );

    this.saveDatabase();

    return {
      success: true,
      contact,
      cancelledCount,
      timestamp: now,
    };
  }

  public getSuppressionList(): string[] {
    const list = new Set<string>();
    // From global persistent suppression list
    if (this.data.suppressionList && Array.isArray(this.data.suppressionList)) {
      for (const p of this.data.suppressionList) {
        const clean = normalizePhoneDigits(p);
        if (clean) list.add(clean);
      }
    }
    // From contacts with OPTED_OUT or BLOCKED
    for (const c of this.data.contacts) {
      if (c.consentStatus === 'OPTED_OUT' || c.consentStatus === 'BLOCKED') {
        const clean = normalizePhoneDigits(c.phone);
        if (clean) list.add(clean);
      }
    }
    // From consent records with OPTED_OUT or BLOCKED
    for (const cr of this.data.consentRecords) {
      if (cr.consentStatus === 'OPTED_OUT' || cr.consentStatus === 'BLOCKED') {
        const clean = normalizePhoneDigits(cr.phone);
        if (clean) list.add(clean);
      }
    }
    return Array.from(list);
  }

  public isSuppressed(phone: string): boolean {
    if (!phone) return false;
    const clean = normalizePhoneDigits(phone);
    if (!clean) return false;
    const suppressionList = this.getSuppressionList();
    return suppressionList.some((p) => arePhonesMatching(p, clean));
  }

  // Groups
  public getGroups(): ContactGroup[] {
    return this.data.groups;
  }

  public createGroup(name: string, description: string, contactIds: string[] = []): ContactGroup {
    const newGroup: ContactGroup = {
      id: 'g-' + Date.now(),
      name,
      description,
      contactIds,
      createdAt: new Date().toISOString(),
    };
    this.data.groups.push(newGroup);
    this.saveDatabase();
    return newGroup;
  }

  public updateGroup(id: string, updates: Partial<ContactGroup>): ContactGroup | null {
    const idx = this.data.groups.findIndex((g) => g.id === id);
    if (idx === -1) return null;
    this.data.groups[idx] = { ...this.data.groups[idx], ...updates };
    this.saveDatabase();
    return this.data.groups[idx];
  }

  public deleteGroup(id: string): boolean {
    const prev = this.data.groups.length;
    this.data.groups = this.data.groups.filter((g) => g.id !== id);
    this.saveDatabase();
    return this.data.groups.length < prev;
  }

  // Messages & Conversations
  public getConversations(): Conversation[] {
    return this.data.conversations;
  }

  public getMessages(conversationId?: string): Message[] {
    if (conversationId) {
      return this.data.messages.filter((m) => m.conversationId === conversationId);
    }
    return this.data.messages;
  }

  public addMessage(msg: Omit<Message, 'id' | 'timestamp'>): Message {
    const id = 'm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
    const now = new Date().toISOString();
    const newMsg: Message = {
      ...msg,
      id,
      timestamp: now,
    };
    this.data.messages.push(newMsg);

    // Update or create conversation
    let conv = this.data.conversations.find((c) => c.id === newMsg.conversationId || c.contactId === newMsg.contactId);
    if (conv) {
      conv.lastMessage = newMsg.content;
      conv.lastTimestamp = now;
      if (newMsg.direction === 'inbound') {
        conv.unreadCount += 1;
        conv.resolved = false;
      }
    } else {
      const contact = this.getContactById(newMsg.contactId);
      conv = {
        id: newMsg.conversationId || 'conv-' + Date.now(),
        contactId: newMsg.contactId,
        customerName: newMsg.customerName,
        phone: newMsg.phone,
        businessName: contact?.businessName || '',
        category: contact?.category || 'Other',
        lastMessage: newMsg.content,
        lastTimestamp: now,
        unreadCount: newMsg.direction === 'inbound' ? 1 : 0,
        resolved: false,
        consentStatus: contact?.consentStatus || 'NOT_GIVEN',
      };
      this.data.conversations.push(conv);
    }

    this.saveDatabase();
    return newMsg;
  }

  public resolveConversation(conversationId: string, resolved: boolean): boolean {
    const conv = this.data.conversations.find((c) => c.id === conversationId);
    if (!conv) return false;
    conv.resolved = resolved;
    if (resolved) conv.unreadCount = 0;
    this.saveDatabase();
    return true;
  }

  public updateMessageDeliveryReceipt(idOrWaId: string, newStatus: 'DELIVERED' | 'READ'): boolean {
    const msg = this.data.messages.find(
      (m) => m.id === idOrWaId || (m.whatsappMessageId && m.whatsappMessageId === idOrWaId)
    );
    if (!msg) return false;

    // Only update if advancing status (SENT -> DELIVERED -> READ)
    if (msg.status === 'READ') return true; // Already read
    if (msg.status === 'DELIVERED' && newStatus === 'DELIVERED') return true;

    const prevStatus = msg.status;
    msg.status = newStatus;

    // Update campaign statistics ONLY from confirmed events
    if (msg.campaignId) {
      const campaign = this.data.campaigns.find((c) => c.id === msg.campaignId);
      if (campaign) {
        if (newStatus === 'DELIVERED' && prevStatus !== 'DELIVERED') {
          campaign.stats.delivered = (campaign.stats.delivered || 0) + 1;
        } else if (newStatus === 'READ') {
          if (prevStatus !== 'DELIVERED') {
            campaign.stats.delivered = (campaign.stats.delivered || 0) + 1;
          }
          campaign.stats.read = (campaign.stats.read || 0) + 1;
        }
      }
    }

    this.saveDatabase();
    return true;
  }

  // Campaigns
  public getCampaigns(): Campaign[] {
    return this.data.campaigns;
  }

  public createCampaign(campaignData: Omit<Campaign, 'id' | 'createdAt' | 'stats'>): Campaign {
    const id = 'cmp-' + Date.now();
    const newCampaign: Campaign = {
      ...campaignData,
      id,
      createdAt: new Date().toISOString(),
      stats: {
        totalTargeted: 0,
        eligibleOptedIn: 0,
        pendingConsentBlocked: 0,
        optedOutBlocked: 0,
        invalidOrDuplicateBlocked: 0,
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
      },
    };
    this.data.campaigns.push(newCampaign);
    this.saveDatabase();
    return newCampaign;
  }

  // Templates
  public getTemplates(): MessageTemplate[] {
    return this.data.templates;
  }

  public saveTemplate(tpl: Omit<MessageTemplate, 'id' | 'createdAt'> & { id?: string }): MessageTemplate {
    if (tpl.id) {
      const idx = this.data.templates.findIndex((t) => t.id === tpl.id);
      if (idx !== -1) {
        this.data.templates[idx] = { ...this.data.templates[idx], ...tpl };
        this.saveDatabase();
        return this.data.templates[idx];
      }
    }
    const newTpl: MessageTemplate = {
      ...tpl,
      id: 't-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    this.data.templates.push(newTpl);
    this.saveDatabase();
    return newTpl;
  }

  // Auto Replies
  public getAutoReplies(): AutoReplyRule[] {
    return this.data.autoReplies;
  }

  public saveAutoReply(rule: AutoReplyRule): AutoReplyRule {
    const idx = this.data.autoReplies.findIndex((r) => r.id === rule.id);
    if (idx !== -1) {
      this.data.autoReplies[idx] = rule;
    } else {
      this.data.autoReplies.push(rule);
    }
    this.saveDatabase();
    return rule;
  }

  // Keyword Automations
  public getKeywordAutomations(): KeywordAutomation[] {
    return this.data.keywordAutomations;
  }

  public saveKeywordAutomation(rule: KeywordAutomation): KeywordAutomation {
    const idx = this.data.keywordAutomations.findIndex((r) => r.id === rule.id);
    if (idx !== -1) {
      this.data.keywordAutomations[idx] = rule;
    } else {
      this.data.keywordAutomations.push(rule);
    }
    this.saveDatabase();
    return rule;
  }

  // Follow-up Sequences
  public getFollowUpSequences(): FollowUpSequence[] {
    return this.data.followUpSequences;
  }

  public saveFollowUpSequence(seq: FollowUpSequence): FollowUpSequence {
    const idx = this.data.followUpSequences.findIndex((s) => s.id === seq.id);
    if (idx !== -1) {
      this.data.followUpSequences[idx] = seq;
    } else {
      this.data.followUpSequences.push(seq);
    }
    this.saveDatabase();
    return seq;
  }

  // Pacing
  public getPacingConfig(): SmartPacingConfig {
    return this.data.pacingConfig;
  }

  public updatePacingConfig(updates: Partial<SmartPacingConfig>): SmartPacingConfig {
    this.data.pacingConfig = { ...this.data.pacingConfig, ...updates };
    this.saveDatabase();
    return this.data.pacingConfig;
  }

  // Queue
  public getQueue(): MessageQueueItem[] {
    return this.data.messageQueue;
  }

  public enqueueMessage(item: Omit<MessageQueueItem, 'id' | 'status' | 'retryCount'>): MessageQueueItem {
    const queueItem: MessageQueueItem = {
      ...item,
      id: 'q-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      status: 'PENDING',
      retryCount: 0,
    };
    this.data.messageQueue.push(queueItem);
    this.saveDatabase();
    return queueItem;
  }

  public clearQueue() {
    this.data.messageQueue = [];
    this.saveDatabase();
  }

  // Connection Info
  public getConnectionInfo(): WhatsAppConnectionInfo {
    return this.data.connectionInfo;
  }

  public updateConnectionInfo(info: Partial<WhatsAppConnectionInfo>): WhatsAppConnectionInfo {
    this.data.connectionInfo = { ...this.data.connectionInfo, ...info };
    this.saveDatabase();
    return this.data.connectionInfo;
  }

  // Team
  public getTeamMembers(): TeamMember[] {
    return this.data.teamMembers;
  }

  // Audit
  public addAuditLog(actor: string, role: TeamMember['role'], action: string, details: string) {
    this.data.auditLogs.unshift({
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      userName: actor,
      userRole: role,
      action,
      details,
    });
    // Keep max 200 logs
    if (this.data.auditLogs.length > 200) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 200);
    }
  }

  // Persistent Pacing State
  public getPacingState(): PersistentPacingState {
    const todayStr = new Date().toISOString().slice(0, 10);
    // Reset daily count if date has changed
    if (!this.data.pacingState) {
      this.data.pacingState = {
        lastMessageSentAt: null,
        batchStartedAt: null,
        batchCompletedAt: null,
        nextEligibleSendAt: null,
        dailyCount: 0,
        dailyCounterDate: todayStr,
        currentBatchCount: 0,
        workerLock: null,
      };
      this.saveDatabase();
    } else if (this.data.pacingState.dailyCounterDate !== todayStr) {
      this.data.pacingState.dailyCount = 0;
      this.data.pacingState.dailyCounterDate = todayStr;
      this.saveDatabase();
    }
    return this.data.pacingState;
  }

  public updatePacingState(updates: Partial<PersistentPacingState>): PersistentPacingState {
    const current = this.getPacingState();
    this.data.pacingState = { ...current, ...updates };
    this.saveDatabase();
    return this.data.pacingState;
  }

  /**
   * Requirement 8: Atomic claim mechanism.
   * Atomically claims the next eligible queue item for a worker.
   * Prevents concurrent workers or ticks from double-sending.
   */
  public claimNextQueueItem(workerId: string): MessageQueueItem | null {
    const queue = this.data.messageQueue;
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    const item = queue.find((q) => {
      if (q.status === 'PENDING' || q.status === 'SCHEDULED') return true;
      // Reclaim stale claims where worker crashed or stalled for over 60 seconds
      if (q.status === 'PROCESSING' && q.claimedAt) {
        const claimAge = nowMs - new Date(q.claimedAt).getTime();
        return claimAge > 60000;
      }
      return false;
    });

    if (!item) {
      return null;
    }

    // Atomic claim
    item.status = 'PROCESSING';
    item.claimedBy = workerId;
    item.claimedAt = nowIso;
    this.saveDatabase();

    return item;
  }

  public releaseQueueItem(id: string, newStatus: MessageStatus, failureReason?: string) {
    const item = this.data.messageQueue.find((q) => q.id === id);
    if (item) {
      item.status = newStatus;
      if (failureReason) item.failureReason = failureReason;
      this.saveDatabase();
    }
  }

  // User & Authentication helpers
  public findUserById(id: string): TeamMember | undefined {
    return this.data.teamMembers.find((m) => m.id === id);
  }

  public findUserByEmail(email: string): TeamMember | undefined {
    const normalized = email.trim().toLowerCase();
    return this.data.teamMembers.find((m) => m.email.toLowerCase() === normalized);
  }

  public findUserByUsername(username: string): TeamMember | undefined {
    const normalized = username.trim().toLowerCase();
    return this.data.teamMembers.find(
      (m) =>
        m.email.toLowerCase() === normalized ||
        m.name.toLowerCase() === normalized ||
        m.phone.replace(/\D/g, '') === normalized.replace(/\D/g, '') ||
        (normalized === 'admin' && m.role === 'ADMIN') ||
        (normalized === 'manager' && m.role === 'MANAGER') ||
        (normalized === 'employee' && m.role === 'EMPLOYEE')
    );
  }

  public getAuditLogs(): AuditLog[] {
    return this.data.auditLogs;
  }
}

export const db = new Database();
