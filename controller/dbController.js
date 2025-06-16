import User from '../models/User.js' // You need to make sure the model is bound to the correct connection
import { connectUserDB } from '../config/db.js'

export const createDbHandler = async (req, res) => {
	const { db } = req.body // The dynamic database name from request body
	const { userId } = req.body // Assuming userId is passed to associate with the user (can be fetched from session, etc.)

	try {
		// Connect to the user database (MongoDB will create it if it doesn't exist)
		const userConnection = await connectUserDB(db)

		// Use the specific connection for the user database
		const UserModel = userConnection.model('User', User.schema) // Use model on this connection

		// Find the user by their userId (you may need to adjust this depending on your user authentication)
		const user = await UserModel.findById(userId)

		if (!user) {
			return res.status(404).json({ message: 'User not found' })
		}

		// Push the new database name into the user's db array
		user.db.push({ name: db, createdAt: new Date() })

		// Save the updated user document
		await user.save()

		// Return success message indicating the database has been created and added to the user
		return res.json({
			message: `Database '${db}' created successfully and associated with user`,
			user: user, // Optionally return the updated user data
		})
	} catch (err) {
		console.error('Error during database creation or user update:', err)
		return res.status(500).json({
			message: 'Failed to create the database or update user',
			error: err.message,
		})
	}
}

export const deleteDbHandler = async (req, res) => {
	const { db } = req.body // The dynamic database name from request body
	const { userId } = req.body // Assuming userId is passed to associate with the user

	try {
		// Connect to the user database (MongoDB will create it if it doesn't exist)
		const userConnection = await connectUserDB(db)

		// Use the specific connection for the user database
		const UserModel = userConnection.model('User', User.schema) // Use model on this connection

		// Find the user by their userId (you may need to adjust this depending on your user authentication)
		const user = await UserModel.findById(userId)

		if (!user) {
			return res.status(404).json({ message: 'User not found' })
		}

		// Remove the database name from the user's db array
		const dbIndex = user.db.findIndex((entry) => entry.name === db)
		if (dbIndex === -1) {
			return res.status(400).json({ message: `Database '${db}' not associated with the user` })
		}

		// Remove the database from the array
		user.db.splice(dbIndex, 1)

		// Save the updated user document
		await user.save()

		// Now drop the database itself
		await userConnection.db.dropDatabase() // Drop the user database

		// Return success message
		return res.json({
			message: `Database '${db}' deleted successfully and removed from user's db array`,
		})
	} catch (err) {
		console.error('Error during database deletion or user update:', err)
		return res.status(500).json({
			message: 'Failed to delete the database or update user',
			error: err.message,
		})
	}
}
