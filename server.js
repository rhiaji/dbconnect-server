import express from 'express'
import cors from 'cors'
import { connectDB } from './config/db.js'
import appRoutes from './routes/appRoutes.js'
import userRoutes from './routes/userRoutes.js'
import cron from 'node-cron'
import axios from 'axios'

const app = express()
connectDB()

app.use(express.json())

app.use(
	cors({
		origin: ['http://localhost:3000', 'https://dbconnect-ten.vercel.app'], // Allow multiple origins
		methods: ['GET', 'POST', 'PUT', 'DELETE'],
		credentials: true,
	})
)

app.use('/api/app', appRoutes)
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
