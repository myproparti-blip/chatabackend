import Conversation from '../models/Conversation.js'
import { chatWithAI } from '../services/aiService.js'
import { executePaginatedQuery } from '../services/paginationService.js'

// Get all conversations
export const getConversations = async (req, res) => {
  try {
    const userId = req.query.userId
    const page = req.query.page ? parseInt(req.query.page) : 1
    const limit = req.query.limit ? parseInt(req.query.limit) : 20
    
    // userId must be provided to prevent showing conversations from other users
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      })
    }

    // Execute paginated query
    const { data, pagination } = await executePaginatedQuery(
      Conversation,
      { userId },
      {
        select: '_id title messages createdAt updatedAt',
        sort: { updatedAt: -1 },
      },
      page,
      limit
    )

    res.json({
      success: true,
      data: data.map(conv => ({
        id: conv._id,
        title: conv.title,
        messages: conv.messages,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      })),
      pagination,
    })
  } catch (error) {
    console.error('Get Conversations Error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch conversations',
    })
  }
}

// Create new conversation
export const createConversation = async (req, res) => {
  try {
    const userId = req.body.userId
    const { title } = req.body

    // userId must be provided
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      })
    }

    const newConversation = new Conversation({
      userId,
      title: title || 'New chat',
      messages: [
        {
          id: 1,
          type: 'ai',
          content: "Hello! I'm your AI assistant. What would you like to know?",
        },
      ],
    })

    await newConversation.save()

    res.status(201).json({
      success: true,
      data: {
        id: newConversation._id,
        title: newConversation.title,
        messages: newConversation.messages,
      },
    })
  } catch (error) {
    console.error('Create Conversation Error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create conversation',
    })
  }
}

// Get single conversation
export const getConversation = async (req, res) => {
  try {
    const { id } = req.params
    const conversation = await Conversation.findById(id)
      .select('_id title messages createdAt updatedAt')
      .lean() // READ OPERATION: lean() is safe here

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      })
    }

    res.json({
      success: true,
      data: {
        id: conversation._id,
        title: conversation.title,
        messages: conversation.messages,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
    })
  } catch (error) {
    console.error('Get Conversation Error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch conversation',
    })
  }
}

// Send message to conversation
export const sendMessage = async (req, res) => {
  try {
    const { id } = req.params
    const { content, userId, attachments } = req.body

    // Allow either content or attachments, but not empty
    if ((!content || !content.trim()) && (!attachments || attachments.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Message content or attachments are required',
      })
    }

    const conversation = await Conversation.findById(id)

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      })
    }

    // Verify the conversation belongs to the user - exact match required
    if (!userId || String(conversation.userId).trim() !== String(userId).trim()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      })
    }

    // Add user message
    const userMessageId = conversation.messages.length + 1
    const userMessage = {
      id: userMessageId,
      type: 'user',
      content: content ? content.trim() : '[Shared media content]',
      attachments: attachments || [],
    }
    conversation.messages.push(userMessage)

    // Build message content for AI - include attachment descriptions
    let aiMessageContent = content ? content.trim() : ''
    if (attachments && attachments.length > 0) {
      const attachmentInfo = attachments
        .map((att, idx) => `[${att.type.toUpperCase()} ${idx + 1}: ${att.originalName}]`)
        .join(' ')
      aiMessageContent = aiMessageContent 
        ? `${aiMessageContent} ${attachmentInfo}`
        : `User shared: ${attachmentInfo}`
    }

    // Get AI response
    const messagesForAI = conversation.messages
      .filter(msg => msg.type === 'user' || msg.type === 'ai')
      .map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.type === 'user' && msg.attachments?.length > 0
          ? `${msg.content} [Contains ${msg.attachments.length} attachment(s): ${msg.attachments.map(a => a.originalName).join(', ')}]`
          : msg.content,
      }))

    const aiResponse = await chatWithAI(messagesForAI)

    if (!aiResponse.success) {
      return res.status(500).json({
        success: false,
        error: aiResponse.error,
      })
    }

    // Add AI message
    const aiMessageId = conversation.messages.length + 1
    const aiMessage = {
      id: aiMessageId,
      type: 'ai',
      content: aiResponse.content,
    }
    conversation.messages.push(aiMessage)

    // Update conversation title if it's the first message
    if (conversation.messages.length === 3) {
      // 1 initial AI + 1 user + 1 AI response
      const chatTitle = content.substring(0, 30) + (content.length > 30 ? '...' : '')
      conversation.title = chatTitle
    }

    await conversation.save()

    res.json({
      success: true,
      data: {
        id: conversation._id,
        title: conversation.title,
        messages: conversation.messages,
        lastMessage: aiMessage,
      },
    })
  } catch (error) {
    console.error('Send Message Error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send message',
    })
  }
}

// Update conversation title
export const updateConversation = async (req, res) => {
  try {
    const { id } = req.params
    const { title } = req.body

    const conversation = await Conversation.findByIdAndUpdate(
      id,
      { title },
      { new: true, select: '_id title' }
    )
    // REMOVED .lean() - PUT operation: requires full Mongoose document

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      })
    }

    res.json({
      success: true,
      data: {
        id: conversation._id,
        title: conversation.title,
      },
    })
  } catch (error) {
    console.error('Update Conversation Error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update conversation',
    })
  }
}

// Delete conversation
export const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params
    const { userId } = req.body

    const conversation = await Conversation.findById(id)
      .select('userId')
      .lean() 

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      })
    }

    // Verify the conversation belongs to the user - exact match required
    if (!userId || String(conversation.userId).trim() !== String(userId).trim()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      })
    }

    await Conversation.findByIdAndDelete(id)

    res.json({
      success: true,
      message: 'Conversation deleted successfully',
    })
  } catch (error) {
    console.error('Delete Conversation Error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete conversation',
    })
  }
}

// Delete multiple conversations
export const deleteMultipleConversations = async (req, res) => {
  try {
    const { ids, userId } = req.body

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      })
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Conversation IDs are required',
      })
    }

    // Verify all conversations belong to the user (lean for performance on READ)
    const conversations = await Conversation.find({ _id: { $in: ids } })
      .select('userId')
      .lean() // READ OPERATION: lean() is safe for verification before DELETE
    
    for (const conv of conversations) {
      if (String(conv.userId).trim() !== String(userId).trim()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied - some conversations do not belong to you',
        })
      }
    }

    // Delete all conversations in single operation
    const result = await Conversation.deleteMany({
      _id: { $in: ids },
      userId: userId,
    })

    res.json({
      success: true,
      message: 'Conversations deleted successfully',
      deletedCount: result.deletedCount,
    })
  } catch (error) {
    console.error('Delete Multiple Conversations Error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete conversations',
    })
  }
}


