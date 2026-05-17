export const posts = [
  {
    id: "pst_a1b2c3d4",
    logo_text: "AS",
    name: "Arjun Sharma",
    college: "NST",
    course: "B.Tech in AI ML",
    year: "1st Year",
    tag_label: "AI/ML",
    time_uploaded: "2h ago",
    post_content: `Built my first Linear Regression model completely from scratch today using only NumPy.

Honestly, implementing Gradient Descent manually helped me understand ML far better than using scikit-learn directly.

Things I finally understood:
• Cost Function optimization
• Learning rate impact
• Feature scaling importance
• Why gradients explode sometimes

Still a beginner, but this felt like a huge milestone.

#MachineLearning #Python #AI #StudentDeveloper`,
    likes: { is_liked: true, count: 124 },
    is_saved: false,
    is_following: false,
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&auto=format&fit=crop&q=60",
      },
    ],
    links: [
      {
        label: "GitHub Repository",
        url: "https://github.com/arjun/numpy-linear-regression",
      },
    ],
  },

  {
    id: "pst_e5f6g7h8",
    logo_text: "PK",
    name: "Priya Kapoor",
    college: "SST",
    course: "B.Tech in AI ML",
    year: "3rd Year",
    tag_label: "Daily Update",
    time_uploaded: "5h ago",
    post_content: `Finally completed my Deep Learning notes after almost 3 weeks of work.

I rewrote:
• Backpropagation
• CNN Architectures
• Activation Functions
• Optimizers
• Vanishing Gradients

in a much simpler and visual format.

One thing I realized while learning AI:
understanding intuition matters more than memorizing formulas.

If anyone wants the Notion link, feel free to DM me.

#DeepLearning #NeuralNetworks #AIStudents`,
    likes: { is_liked: false, count: 450 },
    is_saved: true,
    is_following: true,
    media: [
      {
        type: "doc",
        url: "https://notion.so/priya/deep-learning-notes-pdf",
        name: "Deep_Learning_Notes_v1.pdf",
      },
    ],
    links: [
      { label: "Notion Workspace", url: "https://notion.so/priya-dl-hub" },
    ],
  },

  {
    id: "pst_i9j0k1l2",
    logo_text: "RV",
    name: "Rohan Verma",
    college: "MU",
    course: "B.Tech in AI ML",
    year: "2nd Year",
    tag_label: "Daily Update",
    time_uploaded: "12h ago",
    post_content: `Spent today simplifying the difference between:

• Supervised Learning
• Unsupervised Learning
• Reinforcement Learning

using real-world examples instead of textbook definitions.

For example:
Netflix recommendations = Unsupervised
Spam Detection = Supervised
Self-driving rewards system = Reinforcement

AI concepts become much easier once you connect them with actual products we use daily.

#ArtificialIntelligence #MLBasics #TechEducation`,
    likes: { is_liked: true, count: 89 },
    is_saved: false,
    is_following: false,
    media: [],
    links: [
      {
        label: "Medium Article",
        url: "https://medium.com/@rohan/ai-basics-simplified",
      },
    ],
  },

  {
    id: "pst_m3n4o5p6",
    logo_text: "IM",
    name: "Isha Malhotra",
    college: "PU",
    course: "B.Tech in AI ML",
    year: "4th Year",
    tag_label: "Project",
    time_uploaded: "1d ago",
    post_content: `After 6 months of work, debugging, failed training runs, and countless dataset issues...

my AI-powered Plant Disease Detection project is finally live.

Built using:
• TensorFlow
• CNNs
• Transfer Learning
• OpenCV

The best part wasn't deployment.

It was watching farmers actually test the prototype today.

Moments like this remind me why I chose AI in the first place.

#ComputerVision #AIForGood #DeepLearning`,
    likes: { is_liked: true, count: 1205 },
    is_saved: true,
    is_following: true,
    media: [
      {
        type: "video",
        url: "https://www.w3schools.com/html/mov_bbb.mp4",
      },
    ],
    links: [
      {
        label: "Live Deployment Link",
        url: "https://plantdisease-detector.ai",
      },
      {
        label: "Research Dataset",
        url: "https://kaggle.com/datasets/plant-disease",
      },
    ],
  },

  {
    id: "pst_q7r8s9t0",
    logo_text: "AY",
    name: "Aditya Yadav",
    college: "NST",
    course: "B.Tech in AI ML",
    year: "2nd Year",
    tag_label: "Daily Update",
    time_uploaded: "45m ago",
    post_content: `Nobody talks enough about how exhausting data cleaning actually is.

Today's workflow:
• Handle missing values
• Remove duplicates
• Fix datatype mismatches
• Standardize columns
• Detect outliers

4 hours gone before even starting analysis.

At this point, I fully understand why people say:
"Data Science is mostly data cleaning."

#DataScience #Pandas #StudentLife`,
    likes: { is_liked: false, count: 32 },
    is_saved: false,
    is_following: false,
    media: [],
    links: [],
  },

  {
    id: "pst_u1v2w3x4",
    logo_text: "SN",
    name: "Sanya Nair",
    college: "SST",
    course: "B.Tech in AI ML",
    year: "1st Year",
    tag_label: "AI/ML",
    time_uploaded: "8h ago",
    post_content: `Started learning Calculus for Machine Learning recently.

What helped me the most:
visual explanations instead of formula memorization.

I'm currently making a beginner-friendly resource list covering:
• Derivatives
• Gradients
• Partial Differentiation
• Optimization intuition

Math feels far less scary once you understand the "why" behind it.

#Calculus #MachineLearning #MathForAI`,
    likes: { is_liked: true, count: 678 },
    is_saved: true,
    is_following: false,
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=60",
      },
    ],
    links: [
      {
        label: "Resource Sheet",
        url: "https://drive.google.com/drive/folders/math-for-ai",
      },
    ],
  },

  {
    id: "pst_y5z6a7b8",
    logo_text: "VK",
    name: "Vikram Khanna",
    college: "MU",
    course: "B.Tech in AI ML",
    year: "3rd Year",
    tag_label: "Project",
    time_uploaded: "3h ago",
    post_content: `Built a real-time Face Mask Detection system today using OpenCV + TensorFlow.

The most difficult part surprisingly wasn't training the model.

It was:
• Optimizing webcam inference
• Reducing lag
• Handling lighting conditions
• Improving real-time detection speed

Computer Vision projects genuinely feel magical once they start working live.

#OpenCV #ComputerVision #TensorFlow`,
    likes: { is_liked: false, count: 210 },
    is_saved: false,
    is_following: true,
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=60",
      },
    ],
    links: [
      {
        label: "Source Code",
        url: "https://github.com/vikram/face-mask-detection",
      },
    ],
  },

  {
    id: "pst_c9d0e1f2",
    logo_text: "MD",
    name: "Mehak Das",
    college: "PU",
    course: "B.Tech in AI ML",
    year: "2nd Year",
    tag_label: "Startup",
    time_uploaded: "15h ago",
    post_content: `Question for people working with large datasets:

Are you still using Pandas heavily in 2026,
or moving towards Polars?

I tested both on a multi-million row dataset today and the performance gap honestly surprised me.

Curious about what people are using in:
• production pipelines
• analytics workflows
• ML preprocessing

Would love to hear real experiences.

#DataEngineering #Polars #Pandas`,
    likes: { is_liked: true, count: 56 },
    is_saved: false,
    is_following: false,
    media: [],
    links: [],
  },

  {
    id: "pst_g3h4i5j6",
    logo_text: "RJ",
    name: "Rahul Jain",
    college: "NST",
    course: "B.Tech in AI ML",
    year: "4th Year",
    tag_label: "Startup",
    time_uploaded: "6h ago",
    post_content: `One thing my internship taught me:

Companies care less about certificates
and more about practical skills.

The most valuable things I used daily:
• SQL
• Python scripting
• APIs
• Communication
• Debugging skills

Also —
my company is currently hiring AI interns.

If you're comfortable with Python + SQL,
feel free to connect.

#Internship #Careers #ArtificialIntelligence`,
    likes: { is_liked: false, count: 890 },
    is_saved: true,
    is_following: true,
    media: [
      {
        type: "doc",
        url: "https://peergrid.com/files/intern-jd.pdf",
        name: "AI_Internship_JD.pdf",
      },
    ],
    links: [
      { label: "Application Form", url: "https://peergrid.com/careers/apply" },
    ],
  },

  {
    id: "pst_k7l8m9n0",
    logo_text: "KP",
    name: "Kunal Patel",
    college: "MU",
    course: "B.Tech in AI ML",
    year: "2nd Year",
    tag_label: "AI/ML",
    time_uploaded: "2d ago",
    post_content: `Been experimenting with local RAG pipelines this week.

Current comparison:
• Mistral 7B
vs
• Llama 3

Surprisingly, smaller optimized models are performing really well on limited hardware.

Main focus areas:
• latency
• retrieval quality
• memory usage
• local deployment

Curious what everyone else is using for offline AI systems.

#LLM #RAG #GenerativeAI`,
    likes: { is_liked: true, count: 128 },
    is_saved: true,
    is_following: false,
    media: [],
    links: [
      {
        label: "Benchmark Data",
        url: "https://github.com/kunal/local-rag-benchmarks",
      },
    ],
  },

  {
    id: "pst_o1p2q3r4",
    logo_text: "SC",
    name: "Sneha Choudhury",
    college: "PU",
    course: "B.Tech in AI ML",
    year: "3rd Year",
    tag_label: "AI/ML",
    time_uploaded: "1h ago",
    post_content: `The deeper I go into NLP,
the more I realize it's basically mathematics disguised as linguistics.

Everything eventually comes back to:
• vectors
• probabilities
• embeddings
• matrix operations
• linear algebra

Transformers looked intimidating at first,
but understanding the math underneath changed everything.

#NLP #Transformers #ArtificialIntelligence`,
    likes: { is_liked: false, count: 94 },
    is_saved: false,
    is_following: false,
    media: [],
    links: [],
  },
  {
    id: "pst_test_ui12",
    logo_text: "DA",
    name: "Dhairya Agrawal",
    college: "NST",
    course: "B.Tech in AI ML",
    year: "3rd Year",
    tag_label: "Project",
    time_uploaded: "Just now",
    post_content: `🚀 UI Stress Test: Testing simultaneous multi-media rendering! 

This post contains a heavy payload to test if the layout holds up under maximum content loads:
• 3 High-resolution Unsplash Images
• 1 Embedded HTML5 Test Video
• 2 Cloud Hosted Document Links
• 2 Anchor Resource Links

Let's see if the dynamic grid layouts, custom badges, and responsive aspect-ratio wrappers work as expected across mobile and desktop interfaces.

#UIUX #WebDev #ReactJS #TailwindCSS #StressTest`,
    likes: { is_liked: true, count: 999 },
    is_saved: true,
    is_following: false,
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=60",
      },
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=60",
      },
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800&auto=format&fit=crop&q=60",
      },
      {
        type: "video",
        url: "https://www.w3schools.com/html/mov_bbb.mp4",
      },
      {
        type: "doc",
        url: "https://peergrid.com/docs/system_architecture.pdf",
        name: "system_architecture_v3.pdf",
      },
      {
        type: "doc",
        url: "https://peergrid.com/docs/api_specification.docx",
        name: "api_endpoint_specification.docx",
      },
    ],
    links: [
      { label: "Live Deployment Preview", url: "https://staging.peergrid.com" },
      {
        label: "Figma Design System",
        url: "https://figma.com/file/peergrid-ui",
      },
    ],
  },
];
