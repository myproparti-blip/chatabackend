import express from 'express'
import cors from 'cors'
import compression from 'compression'
import dotenv from 'dotenv'
import connectDB from './config/db.js'
import conversationRoutes from './routes/conversationRoutes.js'
import authRoutes from './routes/authRoutes.js'
import User from './models/User.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Database Connection
const initializeDB = async () => {
  try {
    const connection = await connectDB()
    console.log('✓ Database connected and indexes auto-created by Mongoose')
  } catch (error) {
    console.error('Database initialization error:', error.message)
  }
}

initializeDB()

// Middleware
app.use(compression())
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' })
})

app.get('/message', (req, res) => {
  res.json({
    message: 'Hello from Express backend',
    timestamp: new Date().toISOString(),
  })
})

// Authentication API routes
app.use('/api/auth', authRoutes)

// Conversation API routes
app.use('/api/conversations', conversationRoutes)


// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message)
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  })
})

// Start Server with error handling
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

// Handle server errors (e.g., port already in use)
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`)
    console.error('Kill the existing process or change the PORT in .env')
    process.exit(1)
  } else {
    console.error('Server error:', err)
  }
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server')
  server.close(() => {
    console.log('HTTP server closed')
    process.exit(0)
  })
})
