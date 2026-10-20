import SearchFeedbackPolicy from '../../models/SearchFeedbackPolicy.js';

const POLICY_ID = 'event-retention-v1';

/**
 * Old purges retained identities for only 31 days. Some are already gone, so
 * extending the surviving tombstones cannot make historical 90-day replays safe.
 * Only events created since this boundary get the longer window; older events
 * keep the original 30-day limit. Do not reset this record during deployments.
 */
export async function getCarriedOfflineSince(now) {
  const existing = await SearchFeedbackPolicy.findById(POLICY_ID).lean();
  if (existing?.carriedOfflineSince) return existing.carriedOfflineSince;
  try {
    const policy = await SearchFeedbackPolicy.findOneAndUpdate(
      { _id: POLICY_ID },
      { $setOnInsert: { carriedOfflineSince: now } },
      { upsert: true, returnDocument: 'after', lean: true },
    );
    return policy.carriedOfflineSince;
  } catch (err) {
    if (err?.code !== 11000) throw err;
    // A concurrent first call created the boundary; the value never changes after creation.
    const raced = await SearchFeedbackPolicy.findById(POLICY_ID).lean();
    if (!raced?.carriedOfflineSince) throw err;
    return raced.carriedOfflineSince;
  }
}
