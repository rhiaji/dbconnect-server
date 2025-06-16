import bcrypt from 'bcryptjs' // Import bcrypt to hash passwords
import { SignJWT } from 'jose' // Importing SignJWT from jose
import User from '../models/User.js' // Import the User model

// Helper function for sending consistent responses
function sendResponse(res, success, message, data = {}) {
	return res.json({
		success,
		message,
		data,
	})
}

// Create User Handler
export const createUserHandler = async (req, res) => {
	const { username, email, password } = req.account // Accessing request body for user data

	// Check if all required fields are provided
	if (!username || !email || !password) {
		return sendResponse(res, false, 'Username, email, and password are required')
	}

	try {
		// Check if user already exists
		const existingUser = await User.findOne({ $or: [{ email }, { username }] })
		if (existingUser) {
			return sendResponse(res, false, 'User with this email or username already exists')
		}

		// Hash the password before saving it to the database
		const hashedPassword = await bcrypt.hash(password, 10)

		// Create and save the new user
		const newUser = new User({
			username,
			email,
			password: hashedPassword,
		})
		await newUser.save()

		return sendResponse(res, true, 'User created successfully')
	} catch (err) {
		console.error('Error creating user:', err)
		return sendResponse(res, false, 'Server error', { error: err.message })
	}
}

// Login User Handler
export const loginUserHandler = async (req, res) => {
	const { username, password } = req.account

	// Ensure both username and password are provided
	if (!username || !password) {
		return sendResponse(res, false, 'Username and password are required')
	}

	try {
		// Find the user by username
		const user = await User.findOne({ username })
		if (!user) {
			return sendResponse(res, false, 'User not found')
		}

		// Compare provided password with the hashed password in the database
		const isMatch = await bcrypt.compare(password, user.password)
		if (!isMatch) {
			return sendResponse(res, false, 'Invalid credentials')
		}

		// Generate a JWT token if the credentials are correct
		const secretKey = process.env.JWT_SECRET
		const payload = {
			userId: user._id.toString(),
			username: user.username,
		}

		// Create the JWT token
		const token = await new SignJWT(payload)
			.setProtectedHeader({ alg: 'HS256' })
			.setIssuedAt()
			.setExpirationTime('3d') // Expiration time: 3 days
			.sign(new TextEncoder().encode(secretKey))

		return sendResponse(res, true, 'Login successful', { token })
	} catch (err) {
		console.error('Error logging in:', err)
		return sendResponse(res, false, 'Server error', { error: err.message })
	}
}

// Get User Handler (with JWT authentication)
export const getUserHandler = async (req, res) => {
	try {
		// Extract userId from the decoded JWT payload attached to req.account
		const { userId } = req.account

		// Retrieve user data from the database using the userId
		const user = await User.findById(userId)
		if (!user) {
			return sendResponse(res, false, 'User not found')
		}

		// Return the user data
		return sendResponse(res, true, 'User data retrieved successfully', { data: user })
	} catch (err) {
		console.error('Error retrieving user data:', err)
		return sendResponse(res, false, 'Failed to retrieve user data', { error: err.message })
	}
}

// Update User Handler
export const updateUserHandler = async (req, res) => {
	const { username, email, apiKey, secretKey, db } = req.body.data // Fields to update
	const { userId } = req.account // Get the userId from the decoded JWT payload

	// Ensure at least one field to update is provided
	if (!username && !email && !apiKey && !secretKey && !db) {
		return sendResponse(res, false, 'No fields to update')
	}

	try {
		// Find the user by userId
		const user = await User.findById(userId)
		if (!user) {
			return sendResponse(res, false, 'User not found')
		}

		// Check for existing username or email conflicts
		if (username && username !== user.username) {
			const existingUsername = await User.findOne({ username })
			if (existingUsername) {
				return sendResponse(res, false, 'Username is already taken')
			}
			user.username = username
		}

		if (email && email !== user.email) {
			const existingEmail = await User.findOne({ email })
			if (existingEmail) {
				return sendResponse(res, false, 'Email is already taken')
			}
			user.email = email
		}

		// Update other fields
		if (apiKey) user.apiKey = apiKey
		if (secretKey) user.secretKey = secretKey
		if (db) user.db = db

		// Save the updated user
		await user.save()

		return sendResponse(res, true, 'User updated successfully', { data: user })
	} catch (err) {
		console.error('Error updating user:', err)
		return sendResponse(res, false, 'Server error', { error: err.message })
	}
}

export const changePasswordHandler = async (req, res) => {
	const { oldPassword, newPassword } = req.body.data
	const { userId } = req.account // Get the userId from the decoded JWT payload

	console.log(req.body.data, oldPassword, newPassword)

	if (!oldPassword || !newPassword) {
		return sendResponse(res, false, 'Old password and new password are required')
	}

	try {
		// Find the user by userId
		const user = await User.findById(userId)
		if (!user) {
			return sendResponse(res, false, 'User not found')
		}

		// Compare the old password with the stored password
		const isMatch = await bcrypt.compare(oldPassword, user.password)
		if (!isMatch) {
			return sendResponse(res, false, 'Old password is incorrect')
		}

		// Hash the new password before saving it
		const hashedPassword = await bcrypt.hash(newPassword, 10)
		user.password = hashedPassword

		// Save the updated user
		await user.save()

		return sendResponse(res, true, 'Password changed successfully')
	} catch (err) {
		console.error('Error changing password:', err)
		return sendResponse(res, false, 'Server error', { error: err.message })
	}
}

export const deleteUserHandler = async (req, res) => {
	const { userId } = req.account

	try {
		// Find and delete the user by userId
		const user = await User.findByIdAndDelete(userId)
		if (!user) {
			return sendResponse(res, false, 'User not found')
		}

		return sendResponse(res, true, 'User deleted successfully')
	} catch (err) {
		console.error('Error deleting user:', err)
		return sendResponse(res, false, 'Server error', { error: err.message })
	}
}
