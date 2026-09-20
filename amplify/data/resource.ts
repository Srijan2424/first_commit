import { a, defineData, type ClientSchema } from "@aws-amplify/backend";
import { clinical } from "../functions/clinical/resource";

const patientRead = (allow: any) => [
  allow.ownerDefinedIn("patientOwner").to(["read"]),
];

const schema = a
  .schema({
    getHome: a
      .mutation()
      .arguments({ input: a.json() })
      .returns(a.json())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(clinical)),
    saveProfile: a
      .mutation()
      .arguments({ input: a.json() })
      .returns(a.json())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(clinical)),
    findPatient: a
      .mutation()
      .arguments({ input: a.json() })
      .returns(a.json())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(clinical)),
    requestConsultation: a
      .mutation()
      .arguments({ input: a.json() })
      .returns(a.json())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(clinical)),
    approveConsultation: a
      .mutation()
      .arguments({ input: a.json() })
      .returns(a.json())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(clinical)),
    declineConsultation: a
      .mutation()
      .arguments({ input: a.json() })
      .returns(a.json())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(clinical)),
    verifyConsultation: a
      .mutation()
      .arguments({ input: a.json() })
      .returns(a.json())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(clinical)),
    getConsultation: a
      .mutation()
      .arguments({ input: a.json() })
      .returns(a.json())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(clinical)),
    saveDraft: a
      .mutation()
      .arguments({ input: a.json() })
      .returns(a.json())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(clinical)),
    closeConsultation: a
      .mutation()
      .arguments({ input: a.json() })
      .returns(a.json())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(clinical)),
    issuePrescription: a
      .mutation()
      .arguments({ input: a.json() })
      .returns(a.json())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(clinical)),
    getPrescription: a
      .mutation()
      .arguments({ input: a.json() })
      .returns(a.json())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(clinical)),
    prepareCertificate: a
      .mutation()
      .arguments({ input: a.json() })
      .returns(a.json())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(clinical)),
    submitCertificate: a
      .mutation()
      .arguments({ input: a.json() })
      .returns(a.json())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(clinical)),
    reviewDoctor: a
      .mutation()
      .arguments({ input: a.json() })
      .returns(a.json())
      .authorization((allow) => [allow.group("VerificationReviewers")])
      .handler(a.handler.function(clinical)),
    User: a
      .model({
        snapshot: a.json(),
        cognitoSub: a.id().required(),
        role: a.enum(["DOCTOR", "PATIENT"]),
        phoneE164: a.phone().required(),
        displayName: a.string().required(),
        avatarId: a.string(),
        status: a.enum(["ACTIVE", "SUSPENDED"]),
      })
      .secondaryIndexes((index) => [index("phoneE164").name("byPhone")])
      .authorization((allow) => [allow.owner().to(["read"])]),

    DoctorProfile: a
      .model({
        snapshot: a.json(),
        userId: a.id().required(),
        fullName: a.string().required(),
        qualifications: a.string().array(),
        specialty: a.string(),
        medicalCouncil: a.string(),
        registrationNumber: a.string(),
        clinicId: a.id(),
        verificationStatus: a.enum([
          "UNVERIFIED",
          "PENDING",
          "VERIFIED",
          "REJECTED",
        ]),
        verifiedAt: a.datetime(),
      })
      .authorization((allow) => [allow.owner().to(["read"])]),

    PatientProfile: a
      .model({
        snapshot: a.json(),
        userId: a.id().required(),
        fullName: a.string().required(),
        dateOfBirth: a.date(),
        sex: a.string(),
        heightCm: a.float(),
        weightKg: a.float(),
        preferredLanguage: a.string(),
        avatarId: a.string(),
      })
      .authorization((allow) => [allow.owner().to(["read"])]),

    Clinic: a
      .model({
        snapshot: a.json(),
        name: a.string().required(),
        addressLine: a.string(),
        city: a.string(),
        state: a.string(),
        postalCode: a.string(),
        phone: a.phone(),
        letterheadKey: a.string(),
      })
      .authorization((allow) => [allow.owner().to(["read"])]),

    VerificationRun: a
      .model({
        snapshot: a.json(),
        doctorId: a.id().required(),
        certificateKey: a.string().required(),
        status: a.enum([
          "UPLOADED",
          "PENDING",
          "VERIFIED",
          "REJECTED",
          "FAILED",
        ]),
        extractedName: a.string(),
        extractedCouncil: a.string(),
        extractedRegistrationNumber: a.string(),
        disclosureAcceptedAt: a.datetime(),
        completedAt: a.datetime(),
        failureReason: a.string(),
      })
      .authorization((allow) => [allow.owner().to(["read"])]),

    ConsultationAccess: a
      .model({
        snapshot: a.json(),
        doctorId: a.id().required(),
        patientId: a.id().required(),
        consultationId: a.id().required(),
        doctorOwner: a.string().required(),
        patientOwner: a.string().required(),
        status: a.enum([
          "REQUESTED",
          "APPROVED",
          "AUTHORIZED",
          "EXPIRED",
          "CLOSED",
          "DECLINED",
        ]),
        // Code digests are stored as private DynamoDB attributes, never in GraphQL.
        codeExpiresAt: a.datetime(),
        accessExpiresAt: a.datetime(),
        ttlExpiresAt: a.integer(),
        attemptsRemaining: a.integer(),
        approvedAt: a.datetime(),
        authorizedAt: a.datetime(),
        closedAt: a.datetime(),
      })
      .secondaryIndexes((index) => [
        index("consultationId").name("byConsultation"),
        index("patientId").name("byPatient"),
        index("doctorId").name("byDoctor"),
      ])
      .authorization(patientRead),

    Consultation: a
      .model({
        snapshot: a.json(),
        patientId: a.id().required(),
        doctorId: a.id().required(),
        clinicId: a.id().required(),
        patientOwner: a.string().required(),
        doctorOwner: a.string().required(),
        accessId: a.id(),
        status: a.enum(["AWAITING_AUTH", "IN_PROGRESS", "CLOSED"]),
        consultationType: a.enum([
          "NEW_CONCERN",
          "FOLLOW_UP",
          "ADDITIONAL_OPINION",
        ]),
        chiefComplaint: a.string(),
        observations: a.string(),
        diagnosis: a.string(),
        startedAt: a.datetime(),
        closedAt: a.datetime(),
        issuedAt: a.datetime(),
      })
      .secondaryIndexes((index) => [
        index("patientId").name("byPatient"),
        index("doctorId").name("byDoctor"),
      ])
      .authorization(patientRead),

    Prescription: a
      .model({
        snapshot: a.json(),
        consultationId: a.id().required(),
        patientId: a.id().required(),
        doctorId: a.id().required(),
        clinicId: a.id().required(),
        patientOwner: a.string().required(),
        doctorOwner: a.string().required(),
        status: a.enum(["DRAFT", "ISSUED"]),
        version: a.integer().required(),
        correctsPrescriptionId: a.id(),
        advice: a.string(),
        followUpAt: a.datetime(),
        documentKey: a.string(),
        verificationCode: a.string(),
        issuedAt: a.datetime(),
        immutableDigest: a.string(),
      })
      .secondaryIndexes((index) => [
        index("patientId").name("byPatient"),
        index("consultationId").name("byConsultation"),
        index("doctorId").name("byDoctor"),
      ])
      .authorization((allow) => [
        allow.ownerDefinedIn("patientOwner").to(["read"]),
      ]),

    PrescriptionItem: a
      .model({
        snapshot: a.json(),
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
        decision: a.enum(["CONTINUE", "CHANGE", "STOP", "ADD"]),
      })
      .secondaryIndexes((index) => [
        index("prescriptionId").name("byPrescription"),
      ])
      .authorization((allow) => [
        allow.ownerDefinedIn("patientOwner").to(["read"]),
      ]),

    MedicationDecision: a
      .model({
        snapshot: a.json(),
        consultationId: a.id().required(),
        prescriptionId: a.id(),
        patientOwner: a.string().required(),
        doctorOwner: a.string().required(),
        medicineName: a.string().required(),
        decision: a.enum(["CONTINUE", "CHANGE", "STOP", "ADD", "NOT_REVIEWED"]),
        beforeSummary: a.string(),
        proposedSummary: a.string(),
        reason: a.string(),
        decidedAt: a.datetime(),
      })
      .secondaryIndexes((index) => [
        index("consultationId").name("byConsultation"),
      ])
      .authorization(patientRead),

    Notification: a
      .model({
        snapshot: a.json(),
        recipientOwner: a.string().required(),
        type: a.enum(["CONSULTATION_ACCESS_REQUEST", "PRESCRIPTION_ISSUED"]),
        title: a.string().required(),
        body: a.string().required(),
        consultationId: a.id(),
        readAt: a.datetime(),
      })
      .secondaryIndexes((index) => [
        index("recipientOwner").name("byRecipient"),
      ])
      .authorization((allow) => [
        allow.ownerDefinedIn("recipientOwner").to(["read"]),
      ]),

    AuditEvent: a
      .model({
        snapshot: a.json(),
        actorOwner: a.string().required(),
        patientOwner: a.string(),
        consultationId: a.id(),
        eventType: a.string().required(),
        entityType: a.string(),
        entityId: a.id(),
        occurredAt: a.datetime().required(),
        metadataJson: a.json(),
      })
      .secondaryIndexes((index) => [
        index("consultationId").name("byConsultation"),
      ])
      .authorization((allow) => [
        allow.ownerDefinedIn("actorOwner").to(["read"]),
        allow.ownerDefinedIn("patientOwner").to(["read"]),
      ]),

    MedicationUseReport: a
      .model({
        snapshot: a.json(),
        patientId: a.id().required(),
        patientOwner: a.string().required(),
        medicineName: a.string().required(),
        reportedInstruction: a.string(),
        source: a.enum(["PATIENT_REPORTED"]),
        active: a.boolean(),
        reportedAt: a.datetime(),
      })
      .secondaryIndexes((index) => [index("patientId").name("byPatient")])
      .authorization((allow) => [
        allow.ownerDefinedIn("patientOwner").to(["read"]),
      ]),
  })
  .authorization((allow) => [allow.resource(clinical)]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: { defaultAuthorizationMode: "userPool" },
});
