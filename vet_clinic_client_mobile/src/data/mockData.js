export const clientProfile = {
  name: 'Maria Santos',
  firstName: 'Maria',
  email: 'client@vetrix.test',
  phone: '0917 555 0198',
  address: 'Barangay San Isidro, Quezon City',
  memberSince: '2026-02-12',
};

export const pets = [
  {
    id: 1,
    name: 'Buddy',
    species: 'Dog',
    breed: 'Golden Retriever',
    birthDate: '2023-02-12',
    age: '3 years',
    gender: 'Male',
    color: 'Golden coat',
    status: 'Approved',
    weight: '24.5 kg',
    allergies: 'None reported',
    criticalNotes: 'No emergency precautions.',
    notes: 'Nervous around loud sounds. Prefers soft food after evening walks.',
    registeredDate: '2026-02-12',
    qrToken: 'BUDDY-SECURE-QR-2026',
  },
  {
    id: 2,
    name: 'Mingming',
    species: 'Cat',
    breed: 'Domestic Shorthair',
    birthDate: '2024-05-18',
    age: '2 years',
    gender: 'Female',
    color: 'Gray tabby',
    status: 'Pending',
    weight: '4.1 kg',
    allergies: 'Chicken sensitivity',
    criticalNotes: 'Use calm handling when stressed.',
    notes: 'Indoor cat. Use towel handling when stressed.',
    registeredDate: '2026-05-18',
  },
  {
    id: 3,
    name: 'Max',
    species: 'Dog',
    breed: 'Aspin',
    birthDate: '2025-05-22',
    age: '1 year',
    gender: 'Male',
    color: 'Brown and white',
    status: 'In-person Confirmation',
    weight: '13.8 kg',
    allergies: 'Unknown',
    criticalNotes: 'Clinic confirmation is still required.',
    notes: 'Needs clinic confirmation before appointment booking.',
    registeredDate: '2026-05-22',
  },
];

export const appointments = [
  {
    id: 101,
    petId: 1,
    petName: 'Buddy',
    date: '2026-06-08',
    time: '10:30 AM',
    requestedDateTime: '2026-06-08T10:30:00',
    serviceType: 'Wellness Checkup',
    status: 'Approved',
    assignedVet: 'Dr. Reyes',
    concern: 'Follow-up checkup and vaccine schedule review.',
    service: 'Wellness Checkup',
    clinicNote: 'Please arrive 10 minutes before the appointment.',
  },
  {
    id: 102,
    petId: 2,
    petName: 'Mingming',
    date: '2026-06-11',
    time: '03:00 PM',
    requestedDateTime: '2026-06-11T15:00:00',
    serviceType: 'Consultation',
    status: 'Pending',
    assignedVet: 'To be assigned',
    concern: 'Sneezing and reduced appetite monitoring.',
    service: 'Consultation',
    clinicNote: 'Waiting for clinic approval.',
  },
  {
    id: 103,
    petId: 1,
    petName: 'Buddy',
    date: '2026-05-20',
    time: '09:00 AM',
    requestedDateTime: '2026-05-20T09:00:00',
    serviceType: 'Routine Visit',
    status: 'Completed',
    assignedVet: 'Dr. Santos',
    concern: 'Routine wellness visit.',
    service: 'Routine Visit',
    clinicNote: 'Completed with mild skin irritation notes.',
  },
];

export const medicalRecords = [
  {
    id: 201,
    petId: 1,
    petName: 'Buddy',
    recordDate: '2026-05-20',
    diagnosis: 'Mild skin irritation',
    consultation: 'Routine wellness exam with collar-area scratching noted.',
    symptoms: 'Minor scratching near collar area',
    treatment: 'Gentle cleaning and topical care',
    prescription: 'Clinic-approved spray for 7 days',
    vetName: 'Dr. Santos',
    vetRemarks: 'Monitor scratching and keep collar dry.',
  },
  {
    id: 202,
    petId: 2,
    petName: 'Mingming',
    recordDate: '2026-04-18',
    diagnosis: 'Healthy, vaccine booster visit',
    consultation: 'Physical check before booster shot.',
    symptoms: 'No active symptoms',
    treatment: 'Routine observation',
    prescription: 'No medication prescribed',
    vetName: 'Dr. Reyes',
    vetRemarks: 'Continue appetite monitoring at home.',
  },
];

export const vaccinationRecords = [
  {
    id: 301,
    petId: 1,
    petName: 'Buddy',
    vaccineName: 'Anti-Rabies',
    dateGiven: '2026-03-18',
    nextDueDate: '2027-03-18',
    vetName: 'Dr. Reyes',
    remarks: 'Annual vaccination completed.',
  },
  {
    id: 302,
    petId: 1,
    petName: 'Buddy',
    vaccineName: '5-in-1 Booster',
    dateGiven: '2026-05-20',
    nextDueDate: '2026-11-20',
    vetName: 'Dr. Santos',
    remarks: 'Return before next due date.',
  },
  {
    id: 303,
    petId: 2,
    petName: 'Mingming',
    vaccineName: 'FVRCP Booster',
    dateGiven: '2026-04-18',
    nextDueDate: '2027-04-18',
    vetName: 'Dr. Reyes',
    remarks: 'No reaction observed after vaccination.',
  },
];

export const notifications = [
  {
    id: 401,
    title: 'Appointment Approved',
    message: 'Buddy has an approved appointment on June 8, 2026 at 10:30 AM.',
    type: 'Appointment',
    status: 'Unread',
    createdAt: '2026-06-02T09:00:00',
  },
  {
    id: 402,
    title: 'Pet Verification Update',
    message: 'Max needs in-person confirmation before appointments and QR access.',
    type: 'Pet',
    status: 'Unread',
    createdAt: '2026-06-01T13:30:00',
  },
  {
    id: 403,
    title: 'Medical Record Added',
    message: 'A new consultation record was added for Buddy.',
    type: 'Record',
    status: 'Read',
    createdAt: '2026-05-20T16:30:00',
  },
  {
    id: 404,
    title: 'Vaccination Reminder',
    message: 'Buddy has a 5-in-1 Booster due on November 20, 2026.',
    type: 'Vaccine',
    status: 'Read',
    createdAt: '2026-05-21T08:15:00',
  },
  {
    id: 405,
    title: 'System Message',
    message: 'Client portal records are view-only until the clinic updates them.',
    type: 'System',
    status: 'Read',
    createdAt: '2026-05-15T10:00:00',
  },
];

export const qrToken = {
  petName: 'Buddy',
  token: 'BUDDY-SECURE-QR-2026',
};

export const chatMessages = [
  {
    id: 1,
    type: 'bot',
    text: 'Hi! Tap a sample concern or type a short message. I will answer in simple words.',
    triage: 'Info',
  },
];

export const chatbotQuickQuestions = [
  {
    label: 'Dog vomiting',
    message: 'My dog is vomiting',
  },
  {
    label: 'Cat sneezing',
    message: 'My cat is sneezing',
  },
  {
    label: 'Vaccine',
    message: 'Vaccine side effects',
  },
  {
    label: 'Not eating',
    message: 'My pet is not eating',
  },
];

export const trustedChatbotApi = {
  name: 'OpenAI Responses API',
  useCase: 'Future Vetrix pet-care guidance chatbot',
  serverRoute: 'vet_clinic/api/mobile_chatbot.php',
  note: 'Keep the API key in PHP, never inside the Expo mobile app.',
};
