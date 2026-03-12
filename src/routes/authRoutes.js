import express from 'express'
import {
  sendOTP,
  verifyOTP,
  getProfile,
  updateProfile,
  logout,
  checkUserExists,
} from '../controllers/authController.js'

const router = express.Router()

// Send OTP
router.post('/send-otp', sendOTP)

// Verify OTP and Login
router.post('/verify-otp', verifyOTP)

// Get user profile
router.get('/profile', getProfile)

// Update user profile
router.put('/profile', updateProfile)

// Check if user exists
router.get('/check-user', checkUserExists)

// Logout
router.post('/logout', logout)

export default router
