import { defineAuth } from "@aws-amplify/backend";

export const auth = defineAuth({
  groups: ["VerificationReviewers"],
  loginWith: {
    phone: { otpLogin: true },
  },
});
