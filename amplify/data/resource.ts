import { a, defineData, type ClientSchema } from '@aws-amplify/backend'

const participantRead = (allow: any) => [
  allow.ownerDefinedIn('patientOwner').to(['read']),
  allow.ownerDefinedIn('doctorOwner').to(['read']),
]

const schema = a.schema({
  User: a.model({
    cognitoSub: a.id().required(),
    role: a.enum(['DOCTOR', 'PATIENT']),
    phoneE164: a.phone().required(),
    displayName: a.string().required(),
    avatarId: a.string(),
    status: a.enum(['ACTIVE', 'SUSPENDED']),
  }).authorization((allow) => [allow.owner()]),

  DoctorProfile: a.model({
    userId: a.id().required(),
    fullName: a.string().required(),
    qualifications: a.string().array(),
    specialty: a.string(),
    medicalCouncil: a.string(),
    registrationNumber: a.string(),
    clinicId: a.id(),
    verificationStatus: a.enum(['UNVERIFIED', 'PENDING', 'DEMO_VERIFIED', 'REJECTED']),
    verifiedAt: a.datetime(),
  }).authorization((allow) => [
    allow.owner().to(['create', 'read', 'update']),
    allow.authenticated().to(['read']),
  ]),

  PatientProfile: a.model({
    userId: a.id().required(),
    fullName: a.string().required(),
    dateOfBirth: a.date(),
    sex: a.string(),
    heightCm: a.float(),
    weightKg: a.float(),
    preferredLanguage: a.string(),
    avatarId: a.string(),
  }).authorization((allow) => [allow.owner()]),

  Clinic: a.model({
    name: a.string().required(),
    addressLine: a.string(),
    city: a.string(),
    state: a.string(),
    postalCode: a.string(),
    phone: a.phone(),
    letterheadKey: a.string(),
  }).authorization((allow) => [
    allow.owner().to(['create', 'read', 'update']),
    allow.authenticated().to(['read']),
  ]),

  VerificationRun: a.model({
    doctorId: a.id().required(),
    certificateKey: a.string().required(),
    status: a.enum(['UPLOADED', 'READING', 'MATCHING', 'COMPARING', 'DEMO_VERIFIED', 'FAILED']),
    extractedName: a.string(),
    extractedCouncil: a.string(),
    extractedRegistrationNumber: a.string(),
    disclosureAcceptedAt: a.datetime(),
    completedAt: a.datetime(),
    failureReason: a.string(),
  }).authorization((allow) => [allow.owner().to(['create', 'read', 'update'])]),

  ConsultationAccess: a.model({
    doctorId: a.id().required(),
    patientId: a.id().required(),
    consultationId: a.id().required(),
    doctorOwner: a.string().required(),
    patientOwner: a.string().required(),
    status: a.enum(['REQUESTED', 'PATIENT_APPROVED', 'AUTHORIZED', 'EXPIRED', 'CLOSED']),
    codeHash: a.string(),
    codeExpiresAt: a.datetime(),
    accessExpiresAt: a.datetime(),
    ttlExpiresAt: a.integer(),
    attemptsRemaining: a.integer(),
    approvedAt: a.datetime(),
    authorizedAt: a.datetime(),
    closedAt: a.datetime(),
  }).secondaryIndexes((index) => [index('consultationId'), index('patientId')]).authorization(participantRead),

  Consultation: a.model({
    patientId: a.id().required(),
    doctorId: a.id().required(),
    clinicId: a.id().required(),
    patientOwner: a.string().required(),
    doctorOwner: a.string().required(),
    accessId: a.id(),
    status: a.enum(['AWAITING_AUTH', 'IN_PROGRESS', 'CLOSED']),
    consultationType: a.enum(['NEW_CONCERN', 'FOLLOW_UP', 'ADDITIONAL_OPINION']),
    chiefComplaint: a.string(),
    observations: a.string(),
    diagnosis: a.string(),
    startedAt: a.datetime(),
    closedAt: a.datetime(),
    issuedAt: a.datetime(),
  }).secondaryIndexes((index) => [index('patientId'), index('doctorId')]).authorization(participantRead),

  Prescription: a.model({
    consultationId: a.id().required(),
    patientId: a.id().required(),
    doctorId: a.id().required(),
    clinicId: a.id().required(),
    patientOwner: a.string().required(),
    doctorOwner: a.string().required(),
    status: a.enum(['DRAFT', 'ISSUED']),
    version: a.integer().required(),
    correctsPrescriptionId: a.id(),
    advice: a.string(),
    followUpAt: a.datetime(),
    documentKey: a.string(),
    verificationCode: a.string(),
    issuedAt: a.datetime(),
    immutableDigest: a.string(),
  }).secondaryIndexes((index) => [index('patientId'), index('consultationId')]).authorization((allow) => [
    allow.ownerDefinedIn('patientOwner').to(['read']),
    allow.ownerDefinedIn('doctorOwner').to(['create', 'read']),
  ]),

  PrescriptionItem: a.model({
    prescriptionId: a.id().required(),
    patientOwner: a.string().required(),
    doctorOwner: a.string().required(),
    medicineName: a.string().required(),
    strength: a.string().required(),
    dosage: a.string().required(),
    timing: a.string().array(),
    mealRelation: a.string(),
    durationDays: a.integer(),
    quantity: a.integer(),
    instructions: a.string(),
    decision: a.enum(['CONTINUE', 'CHANGE', 'STOP', 'ADD']),
  }).secondaryIndexes((index) => [index('prescriptionId')]).authorization((allow) => [
    allow.ownerDefinedIn('patientOwner').to(['read']),
    allow.ownerDefinedIn('doctorOwner').to(['create', 'read']),
  ]),

  MedicationDecision: a.model({
    consultationId: a.id().required(),
    prescriptionId: a.id(),
    patientOwner: a.string().required(),
    doctorOwner: a.string().required(),
    medicineName: a.string().required(),
    decision: a.enum(['CONTINUE', 'CHANGE', 'STOP', 'ADD', 'NOT_REVIEWED']),
    beforeSummary: a.string(),
    proposedSummary: a.string(),
    reason: a.string(),
    decidedAt: a.datetime(),
  }).secondaryIndexes((index) => [index('consultationId')]).authorization(participantRead),

  Notification: a.model({
    recipientOwner: a.string().required(),
    type: a.enum(['CONSULTATION_ACCESS_REQUEST', 'PRESCRIPTION_ISSUED']),
    title: a.string().required(),
    body: a.string().required(),
    consultationId: a.id(),
    readAt: a.datetime(),
  }).secondaryIndexes((index) => [index('recipientOwner')]).authorization((allow) => [
    allow.ownerDefinedIn('recipientOwner').to(['read', 'update']),
  ]),

  AuditEvent: a.model({
    actorOwner: a.string().required(),
    patientOwner: a.string(),
    consultationId: a.id(),
    eventType: a.string().required(),
    entityType: a.string(),
    entityId: a.id(),
    occurredAt: a.datetime().required(),
    metadataJson: a.json(),
  }).secondaryIndexes((index) => [index('consultationId')]).authorization((allow) => [
    allow.ownerDefinedIn('actorOwner').to(['create', 'read']),
    allow.ownerDefinedIn('patientOwner').to(['read']),
  ]),

  MedicationUseReport: a.model({
    patientId: a.id().required(),
    patientOwner: a.string().required(),
    medicineName: a.string().required(),
    reportedInstruction: a.string(),
    source: a.enum(['PATIENT_REPORTED']),
    active: a.boolean(),
    reportedAt: a.datetime(),
  }).secondaryIndexes((index) => [index('patientId')]).authorization((allow) => [
    allow.ownerDefinedIn('patientOwner').to(['create', 'read', 'update']),
  ]),
})

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: { defaultAuthorizationMode: 'userPool' },
})
