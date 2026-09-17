export interface JournalArticle {
  id: string;
  title: string;
  slug: string;
  category: "Clinical Review" | "Patient Guide" | "Institutional Notice" | "Preventive Health";
  publishedAt: string;
  readTime: string;
  author: {
    name: string;
    role: string;
  };
  summary: string;
  tags: string[];
}

export const journalArticles: JournalArticle[] = [
  {
    id: "rapid-triage-acute-coronary",
    title: "Reducing Door to Balloon Intervals in Hyperacute Myocardial Infarction",
    slug: "reducing-door-to-balloon-intervals",
    category: "Clinical Review",
    publishedAt: "2026-08-14",
    readTime: "6 min read",
    author: {
      name: "Dr. Ananya Mehta",
      role: "Medical Director"
    },
    summary: "A clinical protocol analysis of integrated ambulance telemetry and immediate catheterization laboratory activation at Meridian Hospital.",
    tags: ["Cardiology", "Emergency Protocols", "Clinical Governance"]
  },
  {
    id: "post-operative-joint-mobility",
    title: "Early Mobilization Milestones Following Total Knee Arthroplasty",
    slug: "early-mobilization-knee-arthroplasty",
    category: "Patient Guide",
    publishedAt: "2026-07-28",
    readTime: "4 min read",
    author: {
      name: "Dr. Siddharth Deshmukh",
      role: "Orthopaedic Consultant"
    },
    summary: "Clear expectations, physical therapy schedules, and home recovery milestones for patients preparing for joint replacement.",
    tags: ["Orthopaedics", "Patient Recovery", "Joint Replacement"]
  },
  {
    id: "preventative-cardiometabolic-risk",
    title: "Understanding High-Sensitivity C-Reactive Protein and Atherosclerosis",
    slug: "understanding-hscrp-atherosclerosis",
    category: "Preventive Health",
    publishedAt: "2026-07-02",
    readTime: "5 min read",
    author: {
      name: "Dr. Farida Khan",
      role: "Consultant Physician"
    },
    summary: "Why vascular inflammatory markers offer critical predictive value beyond standard lipid panels in urban working populations.",
    tags: ["Preventive Health", "Diagnostics", "Vascular Health"]
  }
];
