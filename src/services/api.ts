import { demoMode, demoRequest } from "./demo";
import { fetchAuthSession } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/api";
import outputs from "../../amplify_outputs.json";
import type {
  Home,
  Profile,
  ProfileInput,
  Access,
  Draft,
  Medication,
  Prescription,
} from "../../shared/domain";
export const cloudConfigured = demoMode || ("auth" in outputs && "data" in outputs);
// Explicit operation names: the server must enforce ownership and consultation consent.
const operations = new Set([
  "getHome",
  "saveProfile",
  "findPatient",
  "requestConsultation",
  "approveConsultation",
  "declineConsultation",
  "verifyConsultation",
  "getConsultation",
  "saveDraft",
  "closeConsultation",
  "issuePrescription",
  "getPrescription",
  "prepareCertificate",
  "submitCertificate",
  "searchMedicines",
]);
export async function call<T>(
  operation: string,
  input: unknown = {},
): Promise<T> {
  if(demoMode) return demoRequest<T>(operation,input);
  if (!cloudConfigured)
    throw new Error(
      "Account services are not connected yet. No changes have been saved. Please try again after setup is complete.",
    );
  if (!operations.has(operation)) throw new Error("Unsupported operation");
  const session = await fetchAuthSession();
  const response = (await generateClient().graphql({
    query: `mutation Operation($input: AWSJSON) { ${operation}(input: $input) }`,
    variables: { input: JSON.stringify(input) },
    authMode: "userPool",
    authToken: session.tokens?.idToken?.toString(),
  })) as { data?: Record<string, unknown>; errors?: { message: string }[] };
  if (response.errors?.length)
    throw new Error(response.errors.map((e) => e.message).join("; "));
  const value = response.data?.[operation];
  if (value == null)
    throw new Error("The service did not confirm this action. Please retry.");
  const result = typeof value === "string" ? JSON.parse(value) : value;
  if (result?.error) throw new Error(result.error);
  return result as T;
}
export const api = {
  home: () => call<Home>("getHome"),
  saveProfile: (profile: ProfileInput) => call<Profile>("saveProfile", profile),
  findPatient: (phone: string) =>
    call<{ patient: { id: string; fullName: string } | null }>("findPatient", {
      phone,
    }).then((r) => r.patient),
  request: (patientId: string) =>
    call<Access>("requestConsultation", { patientId }),
  approve: (id: string) =>
    call<{ code: string; expiresAt: number }>("approveConsultation", { id }),
  decline: (id: string) => call("declineConsultation", { id }),
  verify: (id: string, code: string) =>
    call("verifyConsultation", { id, code }),
  consultation: (id: string) =>
    call<{
      access: Access;
      patient: Profile;
      medicines: Medication[];
      prescriptions: Prescription[];
    }>("getConsultation", { id }),
  saveDraft: (id: string, revision: number, draft: Draft) =>
    call<Access>("saveDraft", { id, revision, draft }),
  close: (id: string) => call("closeConsultation", { id }),
  issue: (id: string, revision: number) =>
    call<{ id: string }>("issuePrescription", { id, revision }),
  prescription: (id: string) =>
    call<{ prescription: Prescription; url: string; documentError?: string }>(
      "getPrescription",
      {
        id,
      },
    ),
};
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please retry.";
}
