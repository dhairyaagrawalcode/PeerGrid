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

export type ConnectionRecord = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
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
