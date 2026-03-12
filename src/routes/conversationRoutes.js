import express from 'express'
import {
  getConversations,
  createConversation,
  getConversation,
  sendMessage,
  updateConversation,
  deleteConversation,
  deleteMultipleConversations,
} from '../controllers/conversationController.js'

const router = express.Router()

// Get all conversations
router.get('/', getConversations)

// Create new conversation
router.post('/', createConversation)

// Delete multiple conversations
router.post('/delete-multiple', deleteMultipleConversations)

// Get single conversation
router.get('/:id', getConversation)

// Send message to conversation
router.post('/:id/message', sendMessage)

// Update conversation title
router.put('/:id', updateConversation)

// Delete conversation
router.delete('/:id', deleteConversation)

export default router
