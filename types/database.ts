// Database types for Locana

export type UserRole = 'owner' | 'kasir' | 'customer';

export interface Profile {
  id: string; // UUID, references auth.users
  role: UserRole;
  full_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyProgress {
  id: string;
  customer_id: string; // UUID, references profiles
  current_stamps: number;
  updated_at: string;
}

export interface RewardRule {
  id: string;
  name: string;
  description: string | null;
  target_stamps: number;
  is_active: boolean;
  created_by: string; // UUID, references profiles (owner)
  created_at: string;
  updated_at: string;
}

export interface Reward {
  id: string;
  customer_id: string;
  reward_rule_id: string;
  status: 'available' | 'used';
  earned_at: string;
  used_at: string | null;
  redeemed_by_kasir_id: string | null;
}

export type ScanAction = 'add_stamp' | 'redeem_reward' | 'rejected_cooldown';

export interface ScanLog {
  id: string;
  customer_id: string;
  kasir_id: string;
  action: ScanAction;
  details: string | null;
  created_at: string;
}

// Extended types with joins
export interface RewardWithRule extends Reward {
  reward_rules: RewardRule;
}

export interface ScanLogWithDetails extends ScanLog {
  customer: Pick<Profile, 'full_name' | 'email'>;
  kasir: Pick<Profile, 'full_name'>;
}

// RPC function return types
export interface AddStampResult {
  success: boolean;
  message: string;
  new_stamps: number;
  reward_earned: boolean;
  reward_name?: string;
}

export interface RedeemRewardResult {
  success: boolean;
  message: string;
}
