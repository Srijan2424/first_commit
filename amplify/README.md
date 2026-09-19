# MedPal Amplify backend

This backend defines Cognito phone authentication, the approved DynamoDB/AppSync data model, and private S3 storage.

Patient clinical records are never made broadly readable to the `DOCTOR` role. Production doctor access must be served through consultation-scoped Lambda operations that first verify an active `ConsultationAccess` record. Prescription issuing must run as one server-side transaction that writes the immutable prescription, its items, medication decisions, notification, and audit events.

The current React experience uses synthetic local data until `amplify_outputs.json` is generated. Run `npx ampx sandbox` with an authenticated AWS profile to provision a personal cloud sandbox.
