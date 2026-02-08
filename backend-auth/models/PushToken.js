import mongoose from 'mongoose';

const pushTokenSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true, trim: true },
    platform: { type: String, enum: ['web', 'android'], required: true },
    device: { type: String, trim: true },
    lastSeenAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const PushToken = mongoose.model('PushToken', pushTokenSchema);
export default PushToken;
