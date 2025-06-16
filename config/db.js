import mongoose from 'mongoose'
import { MONGO_URI, MONGO_URI_LOCAL, USER_URI, USER_URI_LOCAL, NODE_ENV } from './config.js'

// Main DB connection
export const connectDB = async () => {
	const uri =
		NODE_ENV === 'production'
			? MONGO_URI // Use the production URI for production environments
			: MONGO_URI_LOCAL // Fallback to local URI in development
	try {
		await mongoose.connect(uri)
		console.log('MongoDB connected...')
	} catch (err) {
		console.error('Error connecting to MongoDB:', err)
		process.exit(1)
	}
}

// User DB connection using createConnection
export const connectUserDB = async (db) => {
	const uri = NODE_ENV === 'production' ? USER_URI : USER_URI_LOCAL

	const additionalParams = '?retryWrites=true&w=majority&appName=dmappservices'
	const userConnection = mongoose.createConnection(`${uri}/${db}${additionalParams}`)

	try {
		await userConnection.asPromise()
		console.log('User MongoDB connected...')
		return userConnection
	} catch (err) {
		console.error('Error connecting to User MongoDB:', err)
		throw new Error('Failed to connect to User MongoDB')
	}
}
