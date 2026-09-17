export interface Department {
  id: string;
  name: string;
  slug: string;
  code: string;
  isFlagship?: boolean;
  shortDescription: string;
  clinicalFocus: string[];
  bedCapacity?: number;
  location: string;
}

export const departments: Department[] = [
  {
    id: "cardiology",
    name: "Cardiology & Cardiac Sciences",
    slug: "cardiology-cardiac-sciences",
    code: "CARD",
    isFlagship: true,
    shortDescription: "Comprehensive invasive, non-invasive, and surgical cardiovascular care including 24/7 primary angioplasty pathways.",
    clinicalFocus: [
      "Interventional Cardiology",
      "Cardiothoracic & Vascular Surgery",
      "Electrophysiology & Arrhythmia",
      "Heart Failure & Cardiac Rehabilitation"
    ],
    bedCapacity: 64,
    location: "Tower A, Floors 3 and 4"
  },
  {
    id: "oncology",
    name: "Oncology",
    slug: "oncology",
    code: "ONCO",
    shortDescription: "Multidisciplinary tumor boards combining medical oncology, surgical oncology, and radiation planning.",
    clinicalFocus: [
      "Medical Oncology & Day Care Chemotherapy",
      "Surgical Oncology",
      "Radiation Oncology",
      "Precision Genomic Profiling"
    ],
    bedCapacity: 48,
    location: "Tower B, Floors 2 and 3"
  },
  {
    id: "neurosciences",
    name: "Neurosciences",
    slug: "neurosciences",
    code: "NEUR",
    shortDescription: "Integrated neurosurgical, stroke, and clinical neurological care with dedicated neuro-intensive monitoring.",
    clinicalFocus: [
      "Neurosurgery & Skull Base Surgery",
      "Comprehensive Stroke Program",
      "Epilepsy & Movement Disorders",
      "Neuro-Critical Care"
    ],
    bedCapacity: 36,
    location: "Tower A, Floor 5"
  },
  {
    id: "orthopaedics",
    name: "Orthopaedics & Joint Replacement",
    slug: "orthopaedics-joint-replacement",
    code: "ORTH",
    shortDescription: "Joint reconstruction, arthroscopic surgery, spine procedures, and targeted musculoskeletal rehabilitation.",
    clinicalFocus: [
      "Primary & Revision Joint Replacement",
      "Arthroscopy & Sports Medicine",
      "Spine Surgery",
      "Orthopaedic Trauma"
    ],
    bedCapacity: 40,
    location: "Tower B, Floor 4"
  },
  {
    id: "gastroenterology",
    name: "Gastroenterology",
    slug: "gastroenterology",
    code: "GAST",
    shortDescription: "Medical and surgical digestive disease management supported by high-definition therapeutic endoscopy.",
    clinicalFocus: [
      "Diagnostic & Therapeutic Endoscopy",
      "Hepatobiliary & Pancreatic Care",
      "Inflammatory Bowel Disease Clinic",
      "GI Surgical Oncology"
    ],
    bedCapacity: 28,
    location: "Tower A, Floor 2"
  },
  {
    id: "nephrology-urology",
    name: "Nephrology & Urology",
    slug: "nephrology-urology",
    code: "NEPH",
    shortDescription: "Hemodialysis, clinical nephrology, and reconstructive endo-urological surgical care.",
    clinicalFocus: [
      "Dialysis & Continuous Renal Replacement",
      "Clinical Nephrology & Hypertension",
      "Endo-Urology & Stone Management",
      "Uro-Oncology"
    ],
    bedCapacity: 30,
    location: "Tower B, Floor 1"
  },
  {
    id: "womens-health",
    name: "Women's Health",
    slug: "womens-health",
    code: "OBGY",
    shortDescription: "Obstetrics, high-risk pregnancy monitoring, minimally invasive gynaecology, and preventative health screenings.",
    clinicalFocus: [
      "Obstetrics & High-Risk Pregnancy",
      "Minimally Invasive Gynaecologic Surgery",
      "Fetal Medicine",
      "Menopause & Preventive Gynaecology"
    ],
    bedCapacity: 32,
    location: "Tower A, Floor 6"
  },
  {
    id: "paediatrics",
    name: "Paediatrics",
    slug: "paediatrics",
    code: "PAED",
    shortDescription: "General paediatrics and specialized neonatal and pediatric intensive care units.",
    clinicalFocus: [
      "Level III Neonatal Intensive Care (NICU)",
      "Pediatric Intensive Care (PICU)",
      "Pediatric Surgery",
      "Developmental Assessment"
    ],
    bedCapacity: 26,
    location: "Tower A, Floor 7"
  },
  {
    id: "pulmonology",
    name: "Pulmonology",
    slug: "pulmonology",
    code: "PULM",
    shortDescription: "Respiratory medicine, pulmonary function testing, sleep medicine, and interventional bronchoscopy.",
    clinicalFocus: [
      "Interventional Pulmonology",
      "Chronic Obstructive Airway Disease",
      "Sleep Disorders & Polysomnography",
      "Interstitial Lung Disease Clinic"
    ],
    bedCapacity: 20,
    location: "Tower B, Floor 5"
  },
  {
    id: "internal-medicine",
    name: "Internal Medicine",
    slug: "internal-medicine",
    code: "IMED",
    shortDescription: "Adult diagnostic medicine, multi-morbidity coordination, chronic illness protocols, and preventative checkups.",
    clinicalFocus: [
      "Diagnostic General Medicine",
      "Diabetes & Metabolic Disorders",
      "Infectious Diseases Management",
      "Preventive Health Assessments"
    ],
    bedCapacity: 34,
    location: "Tower B, Floor 6"
  },
  {
    id: "general-surgery",
    name: "General & Minimally Invasive Surgery",
    slug: "general-surgery",
    code: "SURG",
    shortDescription: "Laparoscopic and open abdominal procedures, surgical wound care, and endocrine surgical interventions.",
    clinicalFocus: [
      "Advanced Laparoscopic Procedures",
      "Hernia & Abdominal Wall Reconstruction",
      "Thyroid & Endocrine Surgery",
      "Colorectal Surgery"
    ],
    bedCapacity: 24,
    location: "Tower A, Floor 2"
  },
  {
    id: "critical-care",
    name: "Critical Care",
    slug: "critical-care",
    code: "ICU",
    shortDescription: "Multi-disciplinary closed intensive care unit with advanced invasive hemodynamic monitoring.",
    clinicalFocus: [
      "Medical Intensive Care",
      "Surgical Intensive Care",
      "Advanced Mechanical Ventilation",
      "Extracorporeal Life Support Protocols"
    ],
    bedCapacity: 44,
    location: "Tower A, Floor 1"
  },
  {
    id: "emergency-medicine",
    name: "Emergency Medicine",
    slug: "emergency-medicine",
    code: "EMER",
    shortDescription: "Level 1 emergency and trauma department operating around the clock with triage protocols.",
    clinicalFocus: [
      "Adult & Pediatric Resuscitation",
      "Acute Coronary & Stroke Triage",
      "Polytrauma Stabilization",
      "Decontamination & Observation Bays"
    ],
    bedCapacity: 22,
    location: "Ground Level, Dedicated Gate 1 Ambulance Bay"
  },
  {
    id: "radiology-imaging",
    name: "Radiology & Imaging",
    slug: "radiology-imaging",
    code: "RADS",
    shortDescription: "Digital diagnostic imaging network comprising 3T MRI, 128-slice dual source CT, and interventional ultrasound.",
    clinicalFocus: [
      "3 Tesla Magnetic Resonance Imaging",
      "Dual Source Computed Tomography",
      "Digital Mammography & Ultrasound",
      "Image-Guided Interventions"
    ],
    location: "Ground Level & Basement 1"
  },
  {
    id: "pathology-laboratory",
    name: "Pathology & Laboratory Medicine",
    slug: "pathology-laboratory-medicine",
    code: "PATH",
    shortDescription: "Automated core clinical biochemistry, hematology, clinical microbiology, and histopathology diagnostics.",
    clinicalFocus: [
      "Histopathology & Cytology",
      "Clinical Biochemistry & Immunoassay",
      "Diagnostic Microbiology",
      "Transfusion Medicine & Blood Bank"
    ],
    location: "Basement 1, Diagnostic Wing"
  }
];
