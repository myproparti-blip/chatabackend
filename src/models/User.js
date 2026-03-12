import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      match: /^[0-9]{10}$/,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      sparse: true,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastLogin: {
      type: Date,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

// Create compound index for frequently queried fields
userSchema.index({ status: 1, isVerified: 1 })

export default mongoose.model('User', userSchema)
