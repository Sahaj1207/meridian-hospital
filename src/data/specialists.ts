export interface Specialist {
  id: string;
  name: string;
  role: string;
  departmentId: string;
  departmentName: string;
  qualifications: string;
  experienceYears: number;
  clinicalInterests: string[];
  opdDays: string;
  isLeadership?: boolean;
}

export const specialists: Specialist[] = [
  {
    id: "dr-ananya-mehta",
    name: "Dr. Ananya Mehta",
    role: "Medical Director & Senior Consultant, Interventional Cardiology",
    departmentId: "cardiology",
    departmentName: "Cardiology & Cardiac Sciences",
    qualifications: "MD (Medicine), DM (Cardiology), FACC",
    experienceYears: 22,
    clinicalInterests: [
      "Complex Coronary Interventions",
      "Structural Heart Disease",
      "Radial Access Angioplasty",
      "Clinical Quality Governance"
    ],
    opdDays: "Monday, Wednesday, Friday: 10:00 to 14:00",
    isLeadership: true
  },
  {
    id: "dr-vikram-oberoi",
    name: "Dr. Vikram Oberoi",
    role: "Director, Surgical Oncology",
    departmentId: "oncology",
    departmentName: "Oncology",
    qualifications: "MS (General Surgery), MCh (Surgical Oncology)",
    experienceYears: 20,
    clinicalInterests: [
      "Thoracic Surgical Oncology",
      "Gastrointestinal Malignancies",
      "Minimally Invasive Tumor Resection"
    ],
    opdDays: "Tuesday, Thursday: 11:00 to 15:00",
    isLeadership: true
  },
  {
    id: "dr-priya-nambiar",
    name: "Dr. Priya Nambiar",
    role: "Head of Critical Care Medicine",
    departmentId: "critical-care",
    departmentName: "Critical Care",
    qualifications: "MD (Anesthesiology), EDIC, FCCP",
    experienceYears: 18,
    clinicalInterests: [
      "Acute Respiratory Distress Syndrome",
      "Extracorporeal Membrane Oxygenation (ECMO)",
      "Hemodynamic Monitoring in Septic Shock"
    ],
    opdDays: "Inpatient and ICU Ward Rounds Daily",
    isLeadership: true
  },
  {
    id: "dr-siddharth-deshmukh",
    name: "Dr. Siddharth Deshmukh",
    role: "Senior Consultant, Joint Reconstruction & Orthopaedics",
    departmentId: "orthopaedics",
    departmentName: "Orthopaedics & Joint Replacement",
    qualifications: "MS (Orthopaedics), MCh (Orthopaedics), Fellowship (Adult Reconstruction)",
    experienceYears: 19,
    clinicalInterests: [
      "Computer-Assisted Knee Arthroplasty",
      "Direct Anterior Hip Replacement",
      "Revision Joint Surgery"
    ],
    opdDays: "Monday, Thursday, Saturday: 09:00 to 13:00"
  },
  {
    id: "dr-farida-khan",
    name: "Dr. Farida Khan",
    role: "Senior Consultant, Clinical Neurosciences",
    departmentId: "neurosciences",
    departmentName: "Neurosciences",
    qualifications: "MD (General Medicine), DM (Neurology)",
    experienceYears: 16,
    clinicalInterests: [
      "Hyperacute Stroke Protocols",
      "Intractable Epilepsy Management",
      "Neuromuscular Disorders"
    ],
    opdDays: "Tuesday, Wednesday, Friday: 14:00 to 18:00"
  }
];
