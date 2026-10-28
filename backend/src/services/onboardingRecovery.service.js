import { findCurrentOnboarding } from "../repositories/onboarding.repository.js";
import { buildOnboardingResponse } from "./onboardingResponse.service.js";

export const recoverCurrentOnboarding = async (client, user) => {
  const workflow = await findCurrentOnboarding(client, user.id, user.sessionId);

  if (!workflow) {
    return {
      hasActiveOnboarding: false,
    };
  }

  const onboarding = await buildOnboardingResponse(
    client,
    workflow.onboardingId,
  );

  return {
    hasActiveOnboarding: true,
    ...onboarding,
  };
};
