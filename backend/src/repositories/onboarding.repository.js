// backend/src/repositories/onboarding.repository.js

export const findCurrentOnboarding = async (client, userId, sessionId) => {
  const result = await client.query(
    `
      SELECT
      onboarding_id
      FROM customer_onboarding_queue
      WHERE
      status = 'IN_PROGRESS'
      AND assigned_to = $1
      AND assigned_session_id = $2
      LIMIT 1
    `,
    [userId, sessionId],
  );

  return result.rows[0] ? { onboardingId: result.rows[0].onboarding_id } : null;
};
