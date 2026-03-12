import User from '../models/User.js'
import OTP from '../models/OTP.js'
import crypto from 'crypto'

// Generate random OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Development static OTP
const DEV_OTP = '123456'

// Send OTP (simulated - implement actual SMS service)
export const sendOTPService = async (phoneNumber) => {
  try {
    // Validate phone number format
    if (!/^[0-9]{10}$/.test(phoneNumber)) {
      return {
        success: false,
        error: 'Invalid phone number format',
      }
    }

    // Use static OTP in development, random in production
    const otp = process.env.NODE_ENV === 'development' ? DEV_OTP : generateOTP()

    // Delete previous OTPs and save new one in parallel
    await Promise.all([
      OTP.deleteMany({ phoneNumber }),
      OTP.create({ phoneNumber, otp }),
    ])

    // TODO: Implement actual SMS service (Twilio, AWS SNS, etc.)
    // For now, log it for development
    console.log(`[OTP] Phone: ${phoneNumber}, OTP: ${otp}`)

    return {
      success: true,
      message: 'OTP sent successfully',
      // Return OTP in development mode
      otp: process.env.NODE_ENV === 'development' ? otp : undefined,
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
    if (!/^[0-9]{10}$/.test(phoneNumber)) {
      return {
        success: false,
        error: 'Invalid phone number format',
      }
    }

    if (!/^[0-9]{6}$/.test(otp)) {
      return {
        success: false,
        error: 'Invalid OTP format',
      }
    }

    // Log verification attempt
    console.log(`[Verify OTP] Phone: ${phoneNumber}, OTP: ${otp}`)

    // Find OTP record with minimal fields and lean for faster lookup (READ operation)
    const otpRecord = await OTP.findOne({
      phoneNumber,
      otp,
      isUsed: false,
    })
      .select('_id otp isUsed expiresAt attempts')
      .lean() // READ OPERATION: lean() is safe for verification queries

    if (!otpRecord) {
      if (process.env.NODE_ENV === 'development') {
        // Log for debugging in development only (select minimal fields)
        const allRecords = await OTP.find({ phoneNumber })
          .select('otp isUsed')
          .lean() // READ OPERATION: lean() is safe for debug logging
        console.log(`[OTP NOT FOUND] Phone: ${phoneNumber}, Attempt OTP: ${otp}`)
        console.log(`[Existing OTPs for phone]:`, allRecords.map(r => ({ otp: r.otp, isUsed: r.isUsed })))
      }
      
      return {
        success: false,
        error: 'Invalid OTP',
      }
    }

    // Check if OTP has expired
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id })
      return {
        success: false,
        error: 'OTP has expired',
      }
    }

    // Check max attempts
    if (otpRecord.attempts >= 5) {
      await OTP.deleteOne({ _id: otpRecord._id })
      return {
        success: false,
        error: 'Maximum OTP attempts exceeded',
      }
    }

    // Mark OTP as used and find/create user in parallel
    const [, user] = await Promise.all([
      OTP.updateOne({ _id: otpRecord._id }, { isUsed: true }),
      findOrCreateUser(phoneNumber),
    ])

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
    // Delete all OTPs for this phone
    await OTP.deleteMany({ phoneNumber })

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
