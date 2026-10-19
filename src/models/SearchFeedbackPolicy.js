import mongoose from 'mongoose';

// A durable rollout boundary, shared by every worker and retained across restarts.
const SearchFeedbackPolicySchema = new mongoose.Schema({
  _id: { type: String, required: true },
  carriedOfflineSince: { type: Date, required: true },
}, { versionKey: false });

export default mongoose.models.SearchFeedbackPolicy || mongoose.model('SearchFeedbackPolicy', SearchFeedbackPolicySchema);
