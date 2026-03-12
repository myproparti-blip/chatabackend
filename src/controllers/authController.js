import {
  sendOTPService,
  verifyOTPService,
  getUserByPhone,
  updateUserProfile,
  logoutService,
} from '../services/authService.js'

// Send OTP
export const sendOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      })
    }

    const result = await sendOTPService(phoneNumber)

    if (!result.success) {
      return res.status(400).json(result)
    }

    res.json(result)
  } catch (error) {
    console.error('Send OTP Controller Error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to send OTP',
    })
  }
}

// Verify OTP and Login
export const verifyOTP = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body

    console.log(`[Verify OTP Controller] Received body:`, req.body)
    console.log(`[Verify OTP Controller] phoneNumber: "${phoneNumber}" (${typeof phoneNumber}), otp: "${otp}" (${typeof otp})`)

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and OTP are required',
      })
    }

    const result = await verifyOTPService(phoneNumber, otp)

    if (!result.success) {
      return res.status(400).json(result)
    }

    // Set cookie with token (optional)
    res.cookie('authToken', result.token, {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    res.json({
      success: true,
      message: result.message,
      user: result.user,
      token: result.token,
    })
  } catch (error) {
    console.error('Verify OTP Controller Error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to verify OTP',
    })
  }
}

// Get user profile
export const getProfile = async (req, res) => {
  try {
    const { phoneNumber } = req.query

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      })
    }

    const result = await getUserByPhone(phoneNumber)

    if (!result.success) {
      return res.status(404).json(result)
    }

    res.json({
      success: true,
      data: result.user,
    })
  } catch (error) {
    console.error('Get Profile Controller Error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
    })
  }
}

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { userId } = req.query
    const updates = req.body

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      })
    }

    const result = await updateUserProfile(userId, updates)

    if (!result.success) {
      return res.status(400).json(result)
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: result.user,
    })
  } catch (error) {
    console.error('Update Profile Controller Error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
    })
  }
}

// Logout
export const logout = async (req, res) => {
  try {
    const { phoneNumber } = req.body

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      })
    }

    const result = await logoutService(phoneNumber)

    if (!result.success) {
      return res.status(400).json(result)
    }

    // Clear auth cookie
    res.clearCookie('authToken')

    res.json({
      success: true,
      message: result.message,
    })
  } catch (error) {
    console.error('Logout Controller Error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to logout',
    })
  }
}

// Check if user exists
export const checkUserExists = async (req, res) => {
  try {
    const { phoneNumber } = req.query

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      })
    }

    const result = await getUserByPhone(phoneNumber)

    res.json({
      success: true,
      exists: result.success,
      isNewUser: !result.success,
    })
  } catch (error) {
    console.error('Check User Controller Error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to check user',
    })
  }
}
