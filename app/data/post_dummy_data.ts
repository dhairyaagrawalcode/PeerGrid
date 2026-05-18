export const posts = [
  {
    id: "post_ln_raft001",
    user_id: "usr_dhairya1", // Dhairya Agrawal
    collage_id: "a7K9x2M5pQ1w", // Newton School of Technology
    tag_label: "Project", //
    content:
      "Spent the last 48 hours debugging distributed system consensus variables. Shipped a custom lightweight Raft consensus implementation in Go to manage state replication across localized container instances.\n\nBiggest technical takeaway: properly handling networking split-brain scenarios is significantly harder than it sounds on paper. Next step is hooking it up to an active Redis cluster to run system-level failure benchmarks. Code base is open sourced! #DistributedSystems #GoLang #BackendDev",
    uploaded_time: "2026-05-18T07:34:00Z",
    likes: {
      is_liked: true,
      num_of_likes: 142,
    },
    is_saved: false,
    is_following_user: false,
    attached_data: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=60",
      }, //
      {
        type: "link",
        url: "https://github.com/dhairya/light-raft",
        name: "GitHub Repository",
      }, //
    ],
  },
  {
    id: "post_ln_hack002",
    user_id: "usr_aarva992", // Aarva Mehta
    collage_id: "9fR2w4L7jK5s", // Scaler School of Technology
    tag_label: "Hackathon", //
    content:
      "Incredible weekend at the Scaler Inter-Campus Sandbox Hackathon! 🚀 Our team built an automated LLM contextual validation agent. It hooks into enterprise Postgres execution pipelines to safely translate raw conversational layout tokens into sanitized, high-performance SQL workflows, reducing optimization times by nearly 70%.\n\nTaking home 2nd place out of 40 developer groups! Huge shoutout to my teammates for working through the night to build this.",
    uploaded_time: "2026-05-17T18:20:00Z",
    likes: {
      is_liked: false,
      num_of_likes: 310,
    },
    is_saved: true,
    is_following_user: true,
    attached_data: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=60",
      }, //
    ],
  },
  {
    id: "post_ln_math003",
    user_id: "usr_priyakp3", // Priya Kapoor
    collage_id: "4bN8v6T1zY3m", // Plaksha University
    tag_label: "Daily Update", //
    content:
      "Many developers jump straight into high-level AI fine-tuning libraries without actually grasping the fundamental matrix mechanics. Today I compiled an interactive math reference manual tracking exact multi-variable gradient descent transformations and custom layer backpropagation vectors.\n\nUnderstanding the math beneath the abstraction layers changes how you structure engineering pipelines entirely. Drop a comment if you want the comprehensive breakdown document link! #MachineLearning #MathForML #ArtificialIntelligence",
    uploaded_time: "2026-05-18T04:10:00Z",
    likes: {
      is_liked: true,
      num_of_likes: 89,
    },
    is_saved: false,
    is_following_user: false,
    attached_data: [
      {
        type: "doc",
        url: "https://peergrid.com/docs/math_ml.pdf",
        name: "Matrix_Calculus_For_ML_v2.pdf",
      }, //
      {
        type: "link",
        url: "https://notion.so/priya-ml-hub",
        name: "Notion Resource Dashboard",
      }, //
    ],
  },
];
