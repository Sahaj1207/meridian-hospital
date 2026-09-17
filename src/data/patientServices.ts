export interface PatientService {
  id: string;
  name: string;
  slug: string;
  category: "clinical" | "administrative" | "support" | "emergency";
  summary: string;
  keyDetails: string[];
  contactAffordance?: string;
  hours: string;
  location: string;
}

export const patientServices: PatientService[] = [
  {
    id: "appointments",
    name: "Appointments",
    slug: "appointment",
    category: "administrative",
    summary: "Consultation scheduling with consultants across 42 specialties, with tele-consultation options.",
    keyDetails: [
      "Online appointment confirmation with SMS and email guidance",
      "Follow-up appointment coordination",
      "Registration assistance at outpatient helpdesks"
    ],
    contactAffordance: "+91 XXX XXX XXXX",
    hours: "Monday to Saturday, 08:00 to 20:00 IST",
    location: "Main Atrium, Ground Floor"
  },
  {
    id: "insurance-billing",
    name: "Insurance & Billing",
    slug: "insurance-billing",
    category: "administrative",
    summary: "Transparent financial counseling, cashless insurance desk coordination, and itemized billing assistance.",
    keyDetails: [
      "Cashless hospitalization coordination for leading Third Party Administrators",
      "Pre-authorization assistance for planned admissions",
      "Itemized estimation before elective procedures"
    ],
    contactAffordance: "+91 XXX XXX XXXX",
    hours: "24 / 7 operational for emergencies; 09:00 to 19:00 for planned admissions",
    location: "Tower A, Ground Floor, Cashless Desk"
  },
  {
    id: "health-checkups",
    name: "Health Checkups",
    slug: "health-checkups",
    category: "clinical",
    summary: "Targeted preventative screening packages designed around age, occupational risk, and family medical history.",
    keyDetails: [
      "Executive and comprehensive wellness assessments",
      "Cardiometabolic screening pathways",
      "Same-day consultation and digital report delivery"
    ],
    contactAffordance: "+91 XXX XXX XXXX",
    hours: "Monday to Saturday, 07:30 to 16:00 IST",
    location: "Tower B, Level 1, Preventative Health Wing"
  },
  {
    id: "international-patients",
    name: "International Patients",
    slug: "international-patients",
    category: "support",
    summary: "Dedicated clinical coordinators for overseas patients needing specialist opinions, travel guidance, and translation.",
    keyDetails: [
      "Prior medical review and clinical cost estimates",
      "Medical visa invitation letters and airport transfers",
      "Language interpretation and dietary accommodation"
    ],
    contactAffordance: "+91 XXX XXX XXXX",
    hours: "Round-the-clock international liaison desk",
    location: "Tower A, Level 1, International Services Suite"
  },
  {
    id: "patient-visitor-info",
    name: "Patient & Visitor Information",
    slug: "patient-visitor-information",
    category: "support",
    summary: "Visiting hours, admission guidelines, room categories, and hospital campus amenities.",
    keyDetails: [
      "General visiting hours: 16:00 to 19:00 daily",
      "ICU visitation: 11:00 to 12:00 and 17:00 to 18:00 (one visitor per patient)",
      "Campus amenities including cafeteria, multi-faith prayer room, and ATM"
    ],
    contactAffordance: "+91 XXX XXX XXXX",
    hours: "24 / 7 Help Desk",
    location: "Main Entrance Atrium"
  },
  {
    id: "pharmacy",
    name: "Pharmacy",
    slug: "pharmacy",
    category: "support",
    summary: "In-house clinical pharmacy dispensing temperature-controlled prescription medication and surgical supplies.",
    keyDetails: [
      "24 / 7 emergency and inpatient dispensing",
      "Computerized medication safety verification",
      "Home delivery available for chronic care prescriptions"
    ],
    contactAffordance: "+91 XXX XXX XXXX",
    hours: "Open 24 hours, 7 days a week",
    location: "Ground Level, Adjacent to Emergency Wing"
  },
  {
    id: "diagnostic-services",
    name: "Diagnostic Services",
    slug: "diagnostic-services",
    category: "clinical",
    summary: "Unified diagnostics encompassing automated pathology, 3T MRI, dual-slice CT, and digital ultrasound.",
    keyDetails: [
      "Rapid turnaround for critical emergency panels",
      "Digital report retrieval via patient portal",
      "Home sample collection for routine blood tests"
    ],
    contactAffordance: "+91 XXX XXX XXXX",
    hours: "24 / 7 for emergency radiology and pathology; routine 07:00 to 20:00",
    location: "Diagnostic Wing, Basement Level 1"
  },
  {
    id: "ambulance-emergency",
    name: "Ambulance / Emergency",
    slug: "ambulance-emergency",
    category: "emergency",
    summary: "Advanced cardiac life support (ACLS) mobile ambulances equipped for rapid critical transit across Mumbai.",
    keyDetails: [
      "Mobile intensive care equipment with onboard doctor / paramedic",
      "Telemetry sync to emergency triage bay while in transit",
      "Direct admission protocols for acute stroke and chest pain"
    ],
    contactAffordance: "+91 XXX XXX XXXX",
    hours: "24 / 7 immediate dispatch",
    location: "Gate 1, Emergency Ground Level Bay"
  },
  {
    id: "patient-feedback",
    name: "Patient Feedback & Grievance",
    slug: "patient-feedback",
    category: "administrative",
    summary: "Dedicated patient advocacy team ensuring care feedback is reviewed promptly by clinical quality leads.",
    keyDetails: [
      "Direct grievance redressal within 48 business hours",
      "Inpatient bedside feedback audits",
      "Quality assurance and clinical protocol updates"
    ],
    contactAffordance: "+91 XXX XXX XXXX",
    hours: "Monday to Saturday, 09:00 to 18:00 IST",
    location: "Administration Block, Level 2"
  }
];
