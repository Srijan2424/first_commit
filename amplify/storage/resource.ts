import { defineStorage } from "@aws-amplify/backend";
// No direct browser read/write grants. The function validates identity and returns
// short-lived signed URLs scoped to a single private object.
export const storage = defineStorage({ name: "medpalPrivateFiles" });
