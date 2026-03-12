import User from '../models/User.js'
import OTP from '../models/OTP.js'
import crypto from 'crypto'

// Dummy OTP for testing
const DUMMY_OTP = '123456'

// Send OTP (simulated - implement actual SMS service)
export const sendOTPService = async (phoneNumber) => {
  try {
    // Validate phone number format
    if (!/^[0-9]{10}$/.test(phoneNumber)) {
      console.error(`[SendOTP] Invalid phone number format: "${phoneNumber}"`)
      return {
        success: false,
        error: 'Invalid phone number format',
      }
    }

    console.log(`[SendOTP] Dummy OTP for phone ${phoneNumber}: ${DUMMY_OTP}`)
    console.log(`[SendOTP] Use OTP "${DUMMY_OTP}" to verify`)

    // TODO: Implement actual SMS service (Twilio, AWS SNS, etc.)
    // For development: OTP is hardcoded as 123456

    return {
      success: true,
      message: 'OTP sent successfully',
      otp: DUMMY_OTP, // Always return dummy OTP for testing
    }
  } catch (error) {
    console.error('Send OTP Error:', error)
    return {
      success: false,
      error: error.message || 'Failed to send OTP',
    }
  }
}

// Verify OTP
export const verifyOTPService = async (phoneNumber, otp) => {
  try {
    // Validate inputs
    console.log(`[Verify OTP] Received Phone: "${phoneNumber}" (type: ${typeof phoneNumber}, length: ${phoneNumber?.length}), OTP: "${otp}" (type: ${typeof otp}, length: ${otp?.length})`)
    
    if (!/^[0-9]{10}$/.test(phoneNumber)) {
      console.error(`[Verify OTP] Invalid phone number format: "${phoneNumber}"`)
      return {
        success: false,
        error: 'Invalid phone number format',
      }
    }

    if (!/^[0-9]{6}$/.test(otp)) {
      console.error(`[Verify OTP] Invalid OTP format: "${otp}"`)
      return {
        success: false,
        error: 'Invalid OTP format',
      }
    }

    console.log(`[Verify OTP] Validation passed. Checking against dummy OTP...`)

    // Check if OTP matches the hardcoded dummy OTP (123456)
    if (otp !== DUMMY_OTP) {
      console.error(`[Verify OTP] OTP mismatch. Expected: ${DUMMY_OTP}, Got: ${otp}`)
      return {
        success: false,
        error: 'Invalid OTP',
      }
    }

    console.log(`[Verify OTP] OTP verified successfully for phone: ${phoneNumber}`)

    // Find or create user
    const user = await findOrCreateUser(phoneNumber)

    // Generate session token (simple approach)
    const token = crypto
      .randomBytes(32)
      .toString('hex')

    return {
      success: true,
      message: 'OTP verified successfully',
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        email: user.email,
      },
      token,
    }
  } catch (error) {
    console.error('Verify OTP Error:', error)
    return {
      success: false,
      error: error.message || 'Failed to verify OTP',
    }
  }
}

// Get user by phone number with lean for performance (GET operation)
export const getUserByPhone = async (phoneNumber) => {
  try {
    const user = await User.findOne({ phoneNumber })
      .select('_id phoneNumber name email')
      .lean() // READ OPERATION: lean() is safe for GET requests
    
    if (!user) {
      return {
        success: false,
        error: 'User not found',
      }
    }

    return {
      success: true,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        email: user.email,
      },
    }
  } catch (error) {
    console.error('Get User Error:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Update user profile
export const updateUserProfile = async (userId, updates) => {
  try {
    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      select: '_id phoneNumber name email',
    })
    // REMOVED .lean() - PUT operation: requires full Mongoose document

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      }
    }

    return {
      success: true,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        email: user.email,
      },
    }
  } catch (error) {
    console.error('Update User Error:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Logout (cleanup session)
export const logoutService = async (phoneNumber) => {
  try {
    console.log(`[Logout] User logged out: ${phoneNumber}`)

    return {
      success: true,
      message: 'Logged out successfully',
    }
  } catch (error) {
    console.error('Logout Error:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Find existing user or create new one
 * @private
 */
async function findOrCreateUser(phoneNumber) {
  // Use upsert for atomic operation
  const user = await User.findOneAndUpdate(
    { phoneNumber },
    {
      $set: {
        isVerified: true,
        lastLogin: new Date(),
      },
      $setOnInsert: {
        name: `User ${phoneNumber.slice(-4)}`,
      },
    },
    {
      upsert: true,
      new: true,
      select: '_id phoneNumber name email',
    }
  )
  // REMOVED .lean() - UPSERT operation: returns updated/created document, not a read operation

  return user
}
