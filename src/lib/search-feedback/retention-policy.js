import SearchFeedbackPolicy from '../../models/SearchFeedbackPolicy.js';

/**
 * Old purges retained identities for only 31 days. Some are already gone, so
 * extending the surviving tombstones cannot make historical 90-day replays safe.
 * Only events created since this boundary get the longer window; older events
 * keep the original 30-day limit. Do not reset this record during deployments.
 */
export async function getCarriedOfflineSince(now) {
  const policy = await SearchFeedbackPolicy.findOneAndUpdate(
    { _id: 'event-retention-v1' },
    { $setOnInsert: { carriedOfflineSince: now } },
    { upsert: true, returnDocument: 'after', lean: true },
  );
  return policy.carriedOfflineSince;
}
