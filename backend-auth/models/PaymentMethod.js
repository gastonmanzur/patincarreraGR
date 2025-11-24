import mongoose from 'mongoose';

const paymentMethodSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['card'],
      required: true
    },
    brand: {
      type: String,
      required: true
    },
    last4: {
      type: String,
      required: true
    },
    expiryMonth: {
      type: Number,
      required: true
    },
    expiryYear: {
      type: Number,
      required: true
    },
    encryptedData: {
      type: String,
      required: true
    },
    iv: {
      type: String,
      required: true
    },
    authTag: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

paymentMethodSchema.index({ club: 1, user: 1, createdAt: -1 });

paymentMethodSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    type: this.type,
    brand: this.brand,
    last4: this.last4,
    expiryMonth: this.expiryMonth,
    expiryYear: this.expiryYear,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const PaymentMethod = mongoose.model('PaymentMethod', paymentMethodSchema);

export default PaymentMethod;
