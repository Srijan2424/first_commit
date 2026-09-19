# MedPal UX Screen Inventory

## Approved direction

- **Surface:** midnight navy
- **Visual language:** editorial clinical interface, warm paper prescription, high-contrast serif headings, restrained sans-serif controls
- **Signature interaction:** a patient-centred treatment constellation with medicines arranged around the patient
- **Core decision model:** Before → Proposed → Reason, followed by Continue, Change, Stop, or Add
- **Scope:** structured prescriptions for independent clinics, doctor verification, patient-authorized consultation access, prescription history, medicine history, and an understandable summary of changes

## Product roles

1. **Doctor:** verifies professional identity, accesses an authorized patient record, conducts a consultation, and issues a prescription.
2. **Patient:** authorizes the consultation, receives prescriptions, sees current recorded instructions, and understands what changed.
3. **Demo verifier:** a disclosed synthetic service simulates document extraction and registry matching. It is not a user-facing role in the hackathon build.

## Screen inventory

### A. Public and shared access

| ID | Screen | Purpose | Priority |
|---|---|---|---|
| A01 | Welcome and role selection | Introduce MedPal and route a person to Doctor or Patient access. | P0 |
| A02 | Sign in or create account | Phone-first access adapted to the selected role. | P0 |
| A03 | Phone verification | Enter the login OTP, resend it, and handle expiry safely. | P0 |

### B. Doctor onboarding and verification

| ID | Screen | Purpose | Priority |
|---|---|---|---|
| D01 | Professional profile | Capture doctor name, council, registration number, specialty, qualifications and contact details. | P0 |
| D02 | Credential documents | Capture or upload registration evidence, review extracted details, and show what will be checked. | P0 |
| D03 | Clinic and letterhead setup | Add clinic identity, address, contact information, logo and prescription footer. | P0 |
| D04 | Demo verification progress and status | Show Read document → Match demo registry → Compare profile → Verified in demo mode, with clear simulation disclosure. | P0 |

### C. Doctor workspace

| ID | Screen | Purpose | Priority |
|---|---|---|---|
| D05 | Doctor home | Resume drafts, find a patient, and see recent completed consultations. | P0 |
| D06 | Patient lookup | Find the patient using their mobile number without revealing medical history yet. | P0 |
| D07 | Consultation authorization | Request and enter the patient's single-use consultation code; explain the access being granted. | P0 |
| D08 | Consultation setup | Select New concern, Follow-up, or Additional opinion and record the presenting concern. | P0 |
| D09 | Patient context | Show demographics, recorded conditions, allergies, active instructions, patient-reported use and previous consultations after authorization. | P0 |
| D10 | Consultation constellation | Main prescribing workspace showing the patient, medicine history and current treatment context. | P0 |
| D11 | Medication decision | Expanded Before → Proposed → Reason editor for Continue, Change, Stop or Add. | P0 |
| D12 | Add medicine | Search/select a medicine and enter strength, form, dose, frequency, timing, duration and instructions. | P0 |
| D13 | Conflicting instructions | Compare contradictory active instructions and deliberately keep, replace, or leave the conflict unresolved. | P0 |
| D14 | Review prescription | Review patient details, consultation information, every medication decision, investigations, advice and follow-up before issuing. | P0 |
| D15 | Issue confirmation | Confirm successful issue, prescription ID/version, patient delivery and the permanent audit entry. | P0 |
| D16 | Prescription document | Full letterhead prescription suitable for viewing, downloading and printing. | P0 |
| D17 | Previous consultation detail | Read an earlier consultation, its original prescription and later linked changes without modifying history. | P1 |
| D18 | Draft consultation recovery | Safely resume or discard an unissued draft after interruption. | P1 |
| D19 | Doctor and clinic settings | Maintain profile, clinic details, signature, letterhead and notification preferences. | P1 |

### D. Patient experience

| ID | Screen | Purpose | Priority |
|---|---|---|---|
| P01 | Patient profile setup | Capture name, date of birth, sex, optional height/weight, account contact information and selection from the approved avatar library. | P0 |
| P02 | Consultation authorization request | Show the requesting doctor and clinic, what access is requested, the code and its expiry. | P0 |
| P03 | Patient home / Today | Present current recorded medicines around the patient with immediate access to recent changes and prescriptions. | P0 |
| P04 | What changed | Explain Added, Changed, Stopped and Continued instructions after a consultation in plain language. | P0 |
| P05 | Medicine detail | Show the current recorded instruction, prescribing doctor, reason, dates and full change timeline. | P0 |
| P06 | My medicines | Separate Active, Past and Needs clarification instructions without merging conflicting prescriptions. | P0 |
| P07 | Prescription library | Browse prescriptions by date, doctor, clinic and concern. | P0 |
| P08 | Prescription detail | View the readable prescription summary and open/download the original signed document. | P0 |
| P09 | Consultation history | View consultations and whether each was a new concern, follow-up or additional opinion. | P1 |
| P10 | Access history and privacy | See which doctor accessed the record, why, when access ended, and report unexpected access. | P1 |
| P11 | Personal details and account settings | Maintain profile, change the selected avatar, language, notifications and account security. Avatar changes do not alter verified identity. | P1 |

### E. Demo verification service

There is no verification-administrator interface in the hackathon visual-design set. Doctor verification is represented through D02 and D04 using synthetic registry data and an explicit “Demo verification” disclosure.

## State boards to design after the main screens

These are reusable states rather than separate pages:

1. Loading and skeleton states.
2. Empty states: no prescriptions, no active medicines, no previous consultations, no drafts.
3. Form validation and upload failure.
4. Incorrect, expired, reused and rate-limited consultation codes.
5. Authorization declined, expired or ended.
6. Unsaved changes and draft recovery.
7. Issue failure and retry without creating duplicate prescriptions.
8. Offline/read-only document access.
9. No medication changes after a consultation.
10. Unresolved conflicting instructions.
11. Verification pending, rejected and more-information-required.
12. Desktop, tablet and mobile responsive behaviour.

## Recommended image-generation order

The first four screens establish the visual grammar used everywhere else:

1. **D10 Consultation constellation** — the product's signature doctor experience.
2. **P03 Patient home / Today** — the patient version of the same treatment model.
3. **P04 What changed** — the clearest expression of MedPal's advantage.
4. **D16 Prescription document** — the trusted artifact joining doctor and patient.

Then complete the main end-to-end demo:

5. D11 Medication decision
6. D12 Add medicine
7. D13 Conflicting instructions
8. D14 Review prescription
9. D15 Issue confirmation
10. D06 Patient lookup
11. D07 Consultation authorization
12. D08 Consultation setup
13. D09 Patient context
14. D05 Doctor home
15. P05 Medicine detail
16. P06 My medicines
17. P07 Prescription library
18. P08 Prescription detail

Then design onboarding and supporting history/settings screens. No administrator screens are required for the hackathon demo.

## Scope guardrails

The first hackathon version does not include appointment scheduling, payments, pharmacy ordering, messaging, teleconsultation, patient-uploaded prescriptions, diagnostic automation, adherence claims, a clinical interaction engine or a verification-administrator interface. The interface must not imply these capabilities. Demo credential verification must be labelled as synthetic and must not claim contact with a government registry.
