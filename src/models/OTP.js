import mongoose from 'mongoose'

const otpSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      index: true,
      match: /^[0-9]{10}$/,
    },
    otp: {
      type: String,
      required: true,
      match: /^[0-9]{6}$/,
    },
    attempts: {
      type: Number,
      default: 0,
      max: 5,
    },
    isUsed: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
  }
)

// Compound index for OTP verification queries
otpSchema.index({ phoneNumber: 1, isUsed: 1 })

export default mongoose.model('OTP', otpSchema)
