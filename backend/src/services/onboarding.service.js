export const releaseUserOnboardings = async (client, userId) => {
  await client.query(
    `
    UPDATE customer_onboarding_queue
    SET
      status='PENDING',
      assigned_to=NULL,
      started_by=NULL,
      started_at=NULL,
      last_activity=NULL
      WHERE
      assigned_to=$1
      AND status='IN_PROGRESS'
    `,
    [userId],
  );
};

export const touchOnboarding = async (
  client,

  onboardingId,
) => {
  await client.query(
    `
    UPDATE customer_onboarding_queue
    SET
    last_activity=NOW()
    WHERE onboarding_id=$1
    `,
    [onboardingId],
  );
};
