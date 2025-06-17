import express from 'express'
import cors from 'cors'
import { connectDB } from './config/db.js'
import appRoutes from './routes/appRoutes.js'
import userRoutes from './routes/userRoutes.js'
import cron from 'node-cron'
import axios from 'axios'
import authMiddleware from './middleware/middleware.js'
import rateLimit from 'express-rate-limit' // Import express-rate-limit

const app = express()
connectDB()

app.use(express.json())

// Set up rate limiting: Limit the number of requests a client can make
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes window
	max: 100, // Limit each IP to 100 requests per windowMs
	message: 'Too many requests, please try again later.',
})

// Apply rate limiter to all routes (can be adjusted to limit only specific routes)
app.use(limiter)

app.use(
	cors({
		origin: '*', // Allow all origins
		methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow the necessary HTTP methods
		credentials: true, // Allow cookies and credentials (for JWT tokens, etc.)
	})
)

app.use('/api/app', authMiddleware, appRoutes)
app.use('/api/user', userRoutes)

// Health check route
app.get('/api/health', (req, res) => {
	res.json({ status: 'ok' })
})

// Set up a cron job to ping the /api/health endpoint every 12 minutes
cron.schedule('*/12 * * * *', async () => {
	try {
		const response = await axios.get('https://dbconnect-server.onrender.com/api/health') // Adjust the URL if needed
		if (response.status === 200) {
			console.log('Pinged the server health check endpoint successfully.')
		} else {
			console.error(`Health check failed with status code: ${response.status}`)
		}
	} catch (error) {
		console.error('Failed to ping the server health check endpoint:', error.message)
	}
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`)
})
