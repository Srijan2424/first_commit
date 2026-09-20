# MedPal — First Commit submission write-up

**Tagline:** Care, in context.

**Track:** Ship It, with consideration for Best UI  
**Team:** Solo build  
**Live demo:** https://main.d2qbejd82l2jqx.amplifyapp.com
**Public repository:** https://github.com/Srijan2424/first_commit
**Demo video:** _Add public or unlisted YouTube URL after recording_  
**AWS Builder Center student verification:** Complete

## The problem

MedPal began with a personal experience. I accompanied my grandmother for an MRI, but we did not carry the paper prescription that authorized the scan. Instead of going home, we had to wait for another doctor and obtain a new prescription. The entire visit took around four hours. The medical instruction already existed; it was simply trapped on paper when we needed it.

Independent clinics across India still rely heavily on handwritten prescriptions. Patients must carry and preserve them, doctors often reconstruct treatment history from memory, and a new prescription rarely explains clearly what changed from the previous one. Large hospital chains have their own digital systems, but those systems do not create a shared prescription experience for local clinics.

## What I built

MedPal is a consent-first digital prescribing platform for independent clinics. It connects a doctor workspace with a patient record while keeping access under the patient's control.

A doctor creates a professional profile, uploads a credential document, finds a patient by phone number, and requests access for one consultation. The patient receives an in-app request and approves it. MedPal then shows the patient a short-lived, single-use code. Only after the doctor enters that code can they open the patient's medicine history.

Inside the consultation, the doctor reviews each active medicine and explicitly chooses to continue, change, or stop it, or adds a new medicine. Changed and stopped medicines require a reason. The final review separates the editable draft from the issued prescription. Once issued, MedPal stores a fixed snapshot and an integrity digest instead of silently editing medical history.

The patient immediately gets a **What changed** view that explains the treatment decision in plain language, followed by a clinic-style prescription that can be opened, printed, or downloaded.

New patient accounts start empty. The full demonstration creates a real patient journey rather than placing a sample prescription on every dashboard.

## What makes MedPal different

Most digital prescription interfaces reproduce the paper document on a screen. MedPal also models the decision between two prescriptions.

Its central interaction is a medicine constellation that places the patient at the centre of active, historical, and attention-needed treatment. Below it, the interface turns each medicine into three parts: **before**, **proposed**, and **reason**. The same decisions become the patient's What changed view after issuance.

This gives both people continuity. The doctor can make an informed change, and the patient can understand exactly what they should do next.

## The demo journey

1. Doctor signs in and completes simulated professional verification.
2. Doctor finds a fictional patient by phone number.
3. Patient receives and approves an in-app authorization request.
4. Doctor enters the patient's single-use consultation code.
5. Doctor reviews current medicines.
6. Doctor continues one medicine, changes one, and adds one.
7. Doctor reviews and issues the prescription.
8. Patient sees What changed and opens the generated prescription.

The doctor and patient can complete this journey from separate browsers or devices using the deployed AWS application.

## Where AWS fits

MedPal is deployed on AWS for the Ship It track.

- **AWS Amplify Hosting** serves the React application over HTTPS.
- **Amazon API Gateway** provides the public demonstration API boundary.
- **AWS Lambda** runs the clinical service and enforces consent, role, access, draft, and issuance rules.
- **Amazon DynamoDB** stores profiles, consultations, access grants, medicine decisions, notifications, prescriptions, and audit events. Conditional transactions prevent stale drafts from silently overwriting newer work.
- **Amazon S3** privately stores uploaded credentials and generated prescription PDFs. Files are accessed only through short-lived signed URLs after server-side checks.
- **Amazon CloudWatch** captures Lambda diagnostics without returning internal errors to the browser.
- **Amazon Cognito and AWS AppSync / Amplify Data** form the production-oriented authenticated path included in the repository.

The public demo deliberately shows login codes on screen and simulates credential approval because evaluators cannot be expected to provide a real medical registration or receive SMS from a hackathon sandbox. That relaxation is clearly labelled. Patient authorization for medical history remains enforced by the backend.

I chose a serverless architecture so the project can stay inexpensive while idle and scale with use. API Gateway, Lambda, DynamoDB, and S3 avoid maintaining a permanent server, while Amplify Hosting gives the project a reproducible public deployment.

## Security and trust

- A doctor cannot read medical history before patient authorization.
- Access is scoped to one doctor, patient, and consultation.
- Consultation codes are salted and hashed, expire after five minutes, allow five attempts, and can be used once.
- Closing the consultation or reaching its expiry ends access; issuance locks that consultation's draft to the prescription.
- Issued prescriptions and medicine decisions are immutable snapshots.
- Credential files and prescriptions remain private in S3.
- Uploads are checked by size, declared type, and file signature.
- Audit events record important access and prescription actions.
- Browser security headers restrict framing, external connections, permissions, and executable content.

MedPal remains a hackathon product, not a clinical service. Real deployment would require verified professional-registry integrations, production SMS, regulatory and privacy review, validated clinical data, and independent security testing.

## What I learned

The hardest part was not generating a prescription. It was keeping the patient's consent and the doctor's workflow connected across two browsers without weakening the data boundary.

I learned how to model that lifecycle as server-side state: requested, approved, authorized, expired, declined, or closed. I also learned how DynamoDB conditional transactions can protect a clinical draft from stale writes, how private S3 objects can be exposed safely for a short time, and how to keep one domain engine working behind both a local adapter and an AWS Lambda adapter.

On the product side, I learned that an unusual visual idea still needs explicit supporting language. The constellation creates identity and overview, while the before/proposed/reason panels make the clinical meaning understandable.

## Current scope and next steps

The current build completes the prescription journey end to end with fictional data. The next product steps are to connect verified medical registries, configure production OTP delivery, expand the India-specific medicine catalogue, add clinically validated safety checks, embed multilingual PDF fonts, and move in-app notifications from polling to real-time subscriptions.

## AI tools, APIs, and credits

- **OpenAI Codex** was used for research, design exploration, implementation assistance,documentation. I reviewed and tested the resulting work.
- **OpenAI image generation** was used for early visual concepts and screen exploration.
- Medicine autocomplete uses the public **U.S. National Library of Medicine RxNorm API**, with manual medicine entry available.
- Open-source libraries and their versions are declared in `package.json` and remain under their respective licences.
- Every person, clinic, credential, medical detail, and prescription shown in the demo is fictional.
