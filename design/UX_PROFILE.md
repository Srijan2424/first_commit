# MedPal UX Profile

## Direction: Calm Clinical Confidence

MedPal should feel like serious clinical software that explains itself. The doctor interface is fast and information-rich. The patient interface is calm, plain-spoken and reassuring. Both use the same treatment model, so a decision made by a doctor becomes an understandable change for the patient.

The memorable idea is: **the patient stays at the centre while every medicine shows where it came from, what changed and who changed it.**

## Experience principles

1. **One obvious next action**
   Each screen has one primary action. Supporting actions remain visible but quiet.

2. **Context before action**
   Before changing a medicine, the doctor sees the current instruction, its prescriber and date, patient-reported use, and relevant history.

3. **Progressive disclosure**
   The constellation gives the overview. Selecting a medicine reveals Before → Proposed → Reason. Detailed history stays one level deeper.

4. **Preserve every clinical statement**
   Issued prescriptions remain immutable. Changes create attributed, linked records instead of silently rewriting history.

5. **Use plain language for patients**
   Prefer “Take one tablet after breakfast” over compact medical notation. Clinical shorthand may appear in the doctor workspace and prescription document when appropriate.

6. **Colour communicates state, never meaning by itself**
   Every colour has an icon and text label. Added, changed, stopped, continued, unresolved and historical states remain distinguishable without colour.

7. **Show why the system is waiting**
   Uploads, verification, authorization and prescription issue show named progress steps instead of a generic spinner.

8. **Make simulations explicit**
   Demo verification is labelled “Demo verification.” The product must never claim that a live government registry was contacted when it was not.

## Role-specific interaction profiles

### Doctor: focused and efficient

- Desktop and tablet first, with mobile support for viewing rather than full prescribing.
- Higher information density, short labels and keyboard-friendly controls.
- The treatment constellation is an overview, not the editor itself.
- Medicine editing uses structured fields and explicit Continue, Change, Stop and Add actions.
- The current patient and authorization state remain pinned throughout the consultation.
- Review before issue is mandatory and shows a count of all changes.
- Destructive or legally meaningful actions require clear confirmation.

### Patient: understandable and reassuring

- Mobile first, with comfortable spacing and at least 44 px touch targets.
- Choose one of the approved MedPal avatars during onboarding and change it later from Personal details.
- The avatar is a visual preference only; verified name, account and patient ID establish identity.
- The first view answers: What should I take today? What changed? Who changed it?
- “What changed” appears before full history.
- Conflicting instructions are shown as “Needs clarification,” without choosing a winner.
- Medical records, prescriptions and access history remain easy to find but do not crowd the home screen.

### Public access and onboarding: guided and transparent

- One decision per step with a visible progress indicator.
- Doctor and patient entry points share the brand but use role-specific language.
- Verification steps explain what information is being read and compared.
- Account OTP and consultation authorization code are visually and verbally distinct.

## Visual system

### Aesthetic

- **Direction:** clinical editorial with a spatial treatment model
- **Decoration:** intentional, using fine orbital lines, restrained texture and paper surfaces
- **Layout:** hybrid; strict grids for forms and records, spatial composition for treatment context
- **Surface:** midnight navy
- **Paper:** warm bone for prescriptions and decisive review surfaces

### Proposed tokens

- Midnight navy: `#071827`
- Elevated navy: `#102536`
- Warm bone: `#F3EEE5`
- Primary text on dark: `#F7F2EA`
- Secondary text on dark: `#AEBCC7`
- Ink on paper: `#182029`
- Continue/success mint: `#8BE2B6`
- Change/warning coral: `#FF735F`
- Informational blue: `#4AA8FF`
- Historical grey: `#89939A`
- Needs clarification amber: `#F0B45A`

### Typography

- **Display and patient-facing headings:** Instrument Serif
- **UI, body and controls:** Instrument Sans
- **Registration numbers, IDs and aligned medical data:** IBM Plex Mono
- Use tabular numbers for dates, dosages, registration numbers and prescription IDs.

### Spacing and shape

- 4 px base unit with an 8 px primary rhythm.
- Doctor workspace: compact-to-comfortable density.
- Patient experience: comfortable-to-spacious density.
- Corners use a hierarchy rather than one universal radius: 6 px controls, 10 px cards, 16 px major surfaces, circular medicine nodes.

### Motion

- 100–180 ms for controls and selection feedback.
- 220–320 ms for drawers and Before → Proposed transitions.
- Up to 450 ms for constellation re-layout after a medication decision.
- Motion explains cause and effect; it does not decorate routine navigation.
- Respect reduced-motion preferences with fades and instant layout changes.

## Demo doctor verification

The demo should use a real file-selection or camera-upload interaction and a simulated verification service.

### Recommended sequence

1. **Capture or upload certificate**
2. **Read document** — show that name, qualification, council and registration number are being extracted
3. **Match registration** — state “Checking demo registry dataset”
4. **Compare profile** — show the extracted values beside the doctor's entered details
5. **Result** — “Verified in demo mode” with the matched fields and timestamp

The sequence should last approximately 6–10 seconds. A disclosure remains visible: “Hackathon demonstration using synthetic registry data. No government registry was contacted.”

The implementation may store the uploaded demo document privately and return a deterministic synthetic result. It must not display a real doctor's certificate or imply legal certification.

## Consultation authorization notification

Account sign-in OTP and consultation authorization are separate concepts.

For the hackathon, use a real backend-generated consultation code with:

- six digits;
- five-minute expiry;
- single use;
- patient, doctor and consultation scope;
- attempt limiting;
- authorization ending when the consultation closes.

Deliver the code through an in-app notification in the patient web experience. This gives us a complete, testable security flow without relying on an SMS provider. An SMS or push adapter can be added later without changing the screens or authorization model.

Do not use one permanent demonstration code. A universal code makes the security story weaker and is unnecessary.

## Safe conventions

- Familiar forms for identity, medicines, dosage and review.
- Persistent patient identity and authorization status.
- A document-shaped prescription preview before issue.
- Explicit confirmation for issue, stop, replace and correction actions.
- Accessible labels, focus states, contrast and touch targets.

## Deliberate design risks

1. **Treatment constellation**
   It makes MedPal memorable and gives patients and doctors one shared model. It costs more design and implementation effort, so every constellation item must also be accessible through a conventional list.

2. **Editorial typography inside clinical software**
   It gives the product authority and distinguishes it from generic SaaS dashboards. Dense controls and tables remain sans-serif to protect readability.

3. **Visible Before → Proposed → Reason editing**
   It takes more space than a normal medicine form, but it makes the product's central promise immediately understandable.

## Screens included in visual design

1. Public and shared access
2. Doctor onboarding and demo verification
3. Doctor workspace
4. Patient experience

The verification-administrator interface is excluded from the hackathon visual-design set. Its result is represented by the disclosed demo verifier and the doctor's verification status screen.

## Avatar data rule

Store the selected option as an `avatarId` from `01` to `16` on the patient profile. Keep the shared avatar artwork as application assets or private/static object-storage assets rather than copying an image into every patient record.
