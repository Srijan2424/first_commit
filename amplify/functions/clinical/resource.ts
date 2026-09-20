import { defineFunction } from "@aws-amplify/backend";
export const clinical = defineFunction({
  name: "clinical",
  entry: "./handler.ts",
  timeoutSeconds: 60,
  memoryMB: 512,
  resourceGroupName: "data",
});
