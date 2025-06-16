import express from 'express'
import cors from 'cors'
import { connectDB } from './config/db.js'
import appRoutes from './routes/appRoutes.js'
import userRoutes from './routes/userRoutes.js'

const app = express()
connectDB()

app.use(express.json())

app.use(
	cors({
		origin: ['http://localhost:3000'], // Allow multiple origins
		methods: ['GET', 'POST', 'PUT', 'DELETE'],
		credentials: true,
	})
)

app.use('/api/app', appRoutes)
app.use('/api/user', userRoutes)

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`)
})
