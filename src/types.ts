/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PlatformType = 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'tiktok';

export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';

export type CtaType = 'Book Now' | 'Learn More' | 'Contact Us' | 'Reserve Now' | 'None';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'agency' | 'client' | 'manager' | 'admin';
  created_at: string;
}

export interface Profile {
  user_id: string;
  bio: string;
  avatar_url: string;
  country: 'Nigeria' | 'Ghana' | 'South Africa' | 'USA' | 'UK' | 'Canada' | 'Australia';
  preferred_platforms: PlatformType[];
  created_at: string;
}

export interface Subscription {
  user_id: string;
  plan_type: 'starter' | 'pro' | 'agency';
  billing_cycle: 'monthly' | 'annual';
  status: 'active' | 'trial' | 'canceled';
  current_period_end: string;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  stripe_payment_intent_id: string;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: 'admin' | 'editor' | 'viewer';
  created_at: string;
}

export interface SocialAccount {
  id: string;
  workspace_id: string;
  platform: PlatformType;
  account_name: string;
  handle: string;
  avatar_url: string;
  connected_at: string;
  status?: 'active' | 'expired';
  expires_at?: string;
}

export interface ScheduledPost {
  id: string;
  workspace_id: string;
  title: string;
  description: string;
  platforms: PlatformType[];
  cta: CtaType;
  publish_date: string;
  status: PostStatus;
  image_url?: string;
  ai_generated?: boolean;
  created_at: string;
}

export interface ContentCalendarEvent {
  id: string;
  workspace_id: string;
  scheduled_post_id: string | null;
  start_time: string;
  end_time: string;
  title: string;
  description: string;
  color: string;
  created_at: string;
}

export interface Analytics {
  workspace_id: string;
  platform: PlatformType;
  followers: number;
  reach: number;
  impressions: number;
  engagement: number;
  clicks: number;
  profile_visits: number;
  growth_rate: number;
  last_updated: string;
}

export interface AnalyticsHistory {
  id: string;
  workspace_id: string;
  platform: PlatformType;
  date: string;
  followers: number;
  reach: number;
  impressions: number;
  engagement: number;
  clicks: number;
  profile_visits: number;
  growth_rate: number;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'growth' | 'credits' | 'calendar' | 'system';
  is_read: boolean;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_user_id: string;
  referred_email: string;
  status: 'pending' | 'signed_up' | 'upgraded';
  reward_granted: boolean;
  created_at: string;
}

export interface ReferralReward {
  id: string;
  user_id: string;
  referral_id: string;
  reward_type: string;
  reward_value: number; // in days of free subscription
  granted_at: string;
}

export interface LeadSearch {
  id: string;
  user_id: string;
  workspace_id: string;
  keyword: string;
  location: string;
  credits_consumed: number;
  created_at: string;
}

export interface LeadResult {
  id: string;
  search_id: string;
  business_name: string;
  email: string;
  phone: string;
  website: string;
  social_links: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
  confidence_score: number;
}

export interface CreditBalance {
  user_id: string;
  remaining_credits: number;
  total_credits_available: number;
  last_updated: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number; // positive or negative
  description: string;
  type: 'charge' | 'purchase' | 'bonus';
  created_at: string;
}

export interface ClientPortal {
  workspace_id: string;
  share_token: string;
  is_enabled: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  workspace_id: string;
  action: string;
  ip_address: string;
  created_at: string;
}

export interface Property {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  ratePerNight: number;
  status: 'Available' | 'Occupied' | 'Maintenance' | 'Reserved';
  imageUrl: string;
  monthlyBookings: number;
  created_at: string;
}

export interface PMSBooking {
  id: string;
  propertyId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  status: 'Confirmed' | 'Completed' | 'Cancelled';
  created_at: string;
}

export interface AdApiConnection {
  platformName: string; // 'Google Ads' | 'Facebook Ads' | 'Instagram Ads' | 'LinkedIn Ads' | 'TikTok Ads'
  connected: boolean;
  clientId: string;
  developerToken?: string;
  adAccountId?: string;
}

export interface UnifiedAdMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  roas: number;
}

