export interface HospitalMetadata {
  name: string;
  shortName: string;
  tagline: string;
  creativePrinciple: string;
  location: {
    city: string;
    state: string;
    country: string;
    address: string;
    landmark: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  institutionType: string;
  scale: {
    beds: number;
    specialties: number;
    specialistsCount: string;
    emergencyAvailability: string;
  };
  flagshipProgram: {
    title: string;
    focus: string;
  };
  leadership: {
    medicalDirector: string;
    title: string;
  };
  emergency: {
    label: string;
    availability: string;
    phone: string;
    ambulancePhone: string;
    deskNote: string;
  };
  appointments: {
    deskPhone: string;
    deskHours: string;
  };
  qualityFramework: {
    title: string;
    description: string;
    standardsAlignment: string;
  };
}

export const hospitalContent: HospitalMetadata = {
  name: "MERIDIAN HOSPITAL",
  shortName: "Meridian",
  tagline: "CARE, MADE CLEAR.",
  creativePrinciple: "Clarity",
  location: {
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    address: "Plot 14, Senapati Bapat Marg, Lower Parel",
    landmark: "Opposite Western Railway Colony",
    coordinates: {
      latitude: 18.9986,
      longitude: 72.8295
    }
  },
  institutionType: "Private multi-specialty tertiary care hospital",
  scale: {
    beds: 320,
    specialties: 42,
    specialistsCount: "210+",
    emergencyAvailability: "24 / 7"
  },
  flagshipProgram: {
    title: "Meridian Heart & Vascular Institute",
    focus: "Integrated cardiovascular surgical and interventional clinical care"
  },
  leadership: {
    medicalDirector: "Dr. Ananya Mehta",
    title: "Medical Director & Head of Clinical Governance"
  },
  emergency: {
    label: "Emergency Care",
    availability: "24 / 7",
    phone: "+91 XXX XXX XXXX",
    ambulancePhone: "+91 XXX XXX XXXX",
    deskNote: "Dedicated triage bays and critical care access via Gate 1"
  },
  appointments: {
    deskPhone: "+91 XXX XXX XXXX",
    deskHours: "Monday to Saturday, 08:00 to 20:00 IST"
  },
  qualityFramework: {
    title: "Institutional Quality & Patient Safety Program",
    description: "Systematic clinical audit, infection control, and patient-centered clinical safety pathways.",
    standardsAlignment: "NABH-aligned quality framework"
  }
};
