import mongoose from 'mongoose'

const attachmentSchema = new mongoose.Schema({
  id: String,
  filename: String,
  originalName: String,
  url: String,
  type: {
    type: String,
    enum: ['image', 'video', 'file'],
  },
  mimetype: String,
  size: Number,
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
})

const messageSchema = new mongoose.Schema({
  id: Number,
  type: {
    type: String,
    enum: ['user', 'ai'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  attachments: [attachmentSchema],
  timestamp: {
    type: Date,
    default: Date.now,
  },
})

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: 'guest',
      index: true,
    },
    title: {
      type: String,
      required: true,
      default: 'New chat',
    },
    messages: [messageSchema],
  },
  {
    timestamps: true,
  }
)

// Compound index for user's conversation queries sorted by update time
conversationSchema.index({ userId: 1, updatedAt: -1 })

export default mongoose.model('Conversation', conversationSchema)
