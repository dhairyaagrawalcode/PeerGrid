export type Campus = {
  id: string;
  slug: string;
  name: string;
  city: string;
};

export type StudentApproval = {
  user_id: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

export type TaxonomyItem = {
  id: number;
  name: string;
};

export type StudentProfile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  campus_id: string;
  graduation_year: number | null;
  program: string | null;
  current_status: string | null;
  bio: string | null;
  goals: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  is_verified: boolean;
  campus?: Campus | null;
  skills?: TaxonomyItem[];
  interests?: TaxonomyItem[];
  can_help_with?: TaxonomyItem[];
  needs_help_with?: TaxonomyItem[];
};

export type ProfileMatch = {
  student: StudentProfile;
  reason: string;
};

export type ModerationStatus = "pending" | "published" | "held" | "rejected";

export type CollaborationProofParticipant = Pick<
  StudentProfile,
  "id" | "username" | "full_name" | "avatar_url"
> & { role: string };

export type CollaborationProof = {
  id: string;
  project_name: string;
  skills_used: string[];
  duration: string;
  project_url: string | null;
  outcome: string | null;
  completion_date: string;
  participants: CollaborationProofParticipant[];
};

export type CollaborationParticipantOption = Pick<
  StudentProfile,
  "id" | "username" | "full_name" | "avatar_url"
> & { campus_name: string | null };

export type PendingCollaborationConfirmation = {
  passport_id: string;
  role: string;
  created_at: string;
  passport: {
    id: string;
    project_name: string;
    duration: string;
    creator: Pick<StudentProfile, "id" | "username" | "full_name" | "avatar_url">;
  };
};

export type FollowRecord = {
  follower_id: string;
  following_id: string;
  created_at: string;
};

export type FollowSummary = {
  follower_count: number;
  following_count: number;
  viewer_follows: boolean;
};

export type ConversationSummary = {
  conversation_id: string;
  other_user_id: string | null;
  other_username: string | null;
  other_full_name: string;
  other_avatar_url: string | null;
  other_program: string | null;
  created_at: string;
  last_activity_at: string;
  last_message_body: string | null;
  last_message_sender_id: string | null;
  last_message_created_at: string | null;
  unread_count: number;
  is_group: boolean;
  group_title: string | null;
  member_count: number;
};

export type ConversationMember = {
  conversation_id: string;
  profile_id: string;
  role: "owner" | "member";
  joined_at: string;
  profile: Pick<StudentProfile, "id" | "username" | "full_name" | "avatar_url">;
};

export type DirectMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  ciphertext: string;
  nonce: string;
  key_envelopes: Record<string, string>;
  encryption_version: 1;
  sender_device_id: string;
  signature: string;
  created_at: string;
  read_at: string | null;
};

export type DecryptedDirectMessage = DirectMessage & {
  plaintext: string | null;
  decryption_error: "missing_key" | "invalid_signature" | "decrypt_failed" | null;
  optimistic?: boolean;
};

export type CryptoDevicePublic = {
  device_id: string;
  profile_id: string;
  box_public_key: string;
  signing_public_key: string;
  revoked_at: string | null;
};

export type PeerGridNotification = {
  id: string;
  type:
    | "collaboration_confirmation_required"
    | "collaboration_confirmation_confirmed"
    | "collaboration_confirmation_declined"
    | "new_follower"
    | "post_from_following"
    | "new_collaboration"
    | "post_liked"
    | "post_commented"
    | "added_to_group";
  collaboration_id: string | null;
  passport_id: string | null;
  post_id: string | null;
  conversation_id: string | null;
  created_at: string;
  read_at: string | null;
  actor: Pick<StudentProfile, "id" | "username" | "full_name" | "avatar_url"> | null;
  collaboration: { id: string; title: string } | null;
  passport: { id: string; project_name: string } | null;
  post: { id: string; body: string } | null;
  conversation: { id: string; title: string | null } | null;
};

export type PostComment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: Pick<StudentProfile, "id" | "username" | "full_name" | "avatar_url">;
};

export type CollaborationPost = {
  id: string;
  author_id: string;
  campus_id: string | null;
  title: string;
  description: string;
  tags: string[];
  collaboration_type: "project" | "hackathon" | "open_source" | "startup" | "study" | "other";
  required_skills: string[];
  team_current: number;
  team_capacity: number | null;
  commitment: string | null;
  status: "open" | "full" | "closed" | "completed";
  moderation_status: ModerationStatus;
  moderation_reason: string | null;
  recommendation_reason?: string | null;
  created_at: string;
  author: Pick<
    StudentProfile,
    "id" | "username" | "full_name" | "avatar_url" | "program"
  >;
  campus: Campus | null;
};

export type SocialPost = {
  id: string;
  author_id: string;
  body: string;
  attachment_path: string | null;
  attachment_kind: "image" | "video" | "document" | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_url: string | null;
  like_count: number;
  comment_count: number;
  viewer_liked: boolean;
  moderation_status: ModerationStatus;
  moderation_reason: string | null;
  recommendation_reason?: string | null;
  created_at: string;
  author: Pick<
    StudentProfile,
    "id" | "username" | "full_name" | "avatar_url" | "program" | "campus"
  >;
};
