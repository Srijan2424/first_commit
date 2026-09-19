# MedPal

MedPal is a digital prescribing workflow for independent clinics. This hackathon build demonstrates doctor onboarding, patient-authorized consultation access, explicit medication decisions, immutable prescription issuance, and a patient-friendly “What changed” view.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

The interface currently uses the approved synthetic demonstration data. The committed `amplify_outputs.json` is a local placeholder; Amplify replaces it with deployed resource configuration.

## Validate

```bash
npm run lint
npm run build
npx tsc --noEmit -p amplify/tsconfig.json
```

## AWS sandbox

After authenticating the AWS CLI for the intended account:

```bash
npm run backend:sandbox
```

The backend defines Cognito phone OTP authentication, AppSync/DynamoDB data models, and private S3 credential storage. Consult `amplify/README.md` before connecting clinical screens to live data because doctor access must remain consultation-scoped.

## Demonstration path

1. Choose Doctor and complete account sign-in.
2. Review the doctor profile and run synthetic verification.
3. Find Priya using `98765 43210`.
4. Simulate patient approval and enter consultation code `482169`.
5. Select Amlodipine in the treatment constellation.
6. Save the dosage change and issue the prescription.
7. Review “What changed” as Priya and open the prescription.

All people, registration numbers, clinical details, and prescriptions in this repository are fictional demonstration data.
