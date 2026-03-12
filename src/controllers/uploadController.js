import { v4 as uuidv4 } from 'uuid'
import cloudinary from '../config/cloudinary.js'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']

export const uploadMedia = async (req, res) => {
  try {
    console.log('=== UPLOAD REQUEST ===')
    console.log('Files:', req.files ? Object.keys(req.files) : 'none')
    console.log('Body:', { conversationId: req.body.conversationId, userId: req.body.userId })

    if (!req.files || Object.keys(req.files).length === 0) {
      console.error('ERROR: No files in request')
      return res.status(400).json({
        success: false,
        error: 'No files were uploaded'
      })
    }

    const file = req.files.file
    if (!file) {
      console.error('ERROR: file object is null')
      return res.status(400).json({
        success: false,
        error: 'File object missing'
      })
    }

    console.log('File received:', {
      name: file.name,
      size: file.size,
      mimetype: file.mimetype,
      dataLength: file.data ? file.data.length : 0,
      isBuffer: Buffer.isBuffer(file.data)
    })

    const { conversationId, userId } = req.body

    // Validate inputs
    if (!conversationId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Conversation ID and User ID are required'
      })
    }

    // Validate file data exists
    if (!file.data) {
      console.error('ERROR: file.data is missing or null')
      return res.status(400).json({
        success: false,
        error: 'File data is missing'
      })
    }

    // Handle both Buffer and string data
    let fileData = file.data
    if (!Buffer.isBuffer(fileData)) {
      fileData = Buffer.from(fileData)
    }

    if (fileData.length === 0) {
      console.error('ERROR: file data is empty')
      return res.status(400).json({
        success: false,
        error: 'File is empty'
      })
    }

    console.log(`File data validated: ${fileData.length} bytes`)

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        error: `File size exceeds maximum limit of 50MB`
      })
    }

    // Validate file type
    if (!ALLOWED_MEDIA_TYPES.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Only images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM, QuickTime) are allowed'
      })
    }

    // Determine file type
    const isImage = file.mimetype.startsWith('image/')
    const isVideo = file.mimetype.startsWith('video/')
    const resourceType = isVideo ? 'video' : 'image'

    console.log(`Uploading to Cloudinary: ${file.name} (${file.size} bytes) as ${resourceType}`)

    // Upload to Cloudinary using buffer
    const uploadResponse = await cloudinary.uploader.upload(
      `data:${file.mimetype};base64,${fileData.toString('base64')}`,
      {
        resource_type: resourceType,
        public_id: `chat-${conversationId}-${uuidv4()}`,
        folder: 'chat-app/uploads',
        quality: 'auto',
        fetch_format: 'auto',
        secure: true,
      }
    )

    console.log(`Upload successful: ${uploadResponse.public_id}`)

    const fileDataResponse = {
      id: uuidv4(),
      filename: uploadResponse.public_id,
      originalName: file.name,
      size: file.size,
      mimetype: file.mimetype,
      type: isImage ? 'image' : isVideo ? 'video' : 'file',
      url: uploadResponse.secure_url,
      cloudinaryId: uploadResponse.public_id,
      uploadedAt: new Date(),
      conversationId: conversationId,
      userId: userId
    }

    res.json({
      success: true,
      data: fileDataResponse
    })
  } catch (error) {
    console.error('Upload Media Error:', error.message)
    console.error('Stack:', error.stack)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload file'
    })
  }
}

export const deleteMedia = async (req, res) => {
  try {
    const { filename } = req.params
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      })
    }

    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Filename is required'
      })
    }

    // Delete from Cloudinary
    const deleteResponse = await cloudinary.uploader.destroy(filename, {
      resource_type: 'auto'
    })

    if (deleteResponse.result !== 'ok') {
      return res.status(404).json({
        success: false,
        error: 'File not found or already deleted'
      })
    }

    res.json({
      success: true,
      message: 'File deleted successfully'
    })
  } catch (error) {
    console.error('Delete Media Error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete file'
    })
  }
}
