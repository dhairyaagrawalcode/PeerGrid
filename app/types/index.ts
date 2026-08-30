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
  bio: string | null;
  goals: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  is_verified: boolean;
  campus?: Campus | null;
  skills?: TaxonomyItem[];
  interests?: TaxonomyItem[];
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
  status: "open" | "closed";
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
  created_at: string;
  author: Pick<
    StudentProfile,
    "id" | "username" | "full_name" | "avatar_url" | "program" | "campus"
  >;
};
