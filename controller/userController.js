import bcrypt from 'bcryptjs' // Import bcrypt to hash passwords
import { SignJWT } from 'jose' // Importing SignJWT from jose
import User from '../models/User.js' // Import the User model

export const createUserHandler = async (req, res) => {
	const { username, email, password } = req.request // Accessing request body for user data

	// Check if all required fields are provided
	if (!username || !email || !password) {
		return res.status(400).json({ message: 'Username, email, and password are required' })
	}

	try {
		// Check if user already exists
		const existingUser = await User.findOne({ $or: [{ email }, { username }] })
		if (existingUser) {
			return res.status(400).json({ message: 'User with this email or username already exists' })
		}

		// Hash the password before saving it to the database
		const salt = await bcrypt.genSalt(10)
		const hashedPassword = await bcrypt.hash(password, salt)

		// Create a new user object
		const newUser = new User({
			username,
			email,
			password: hashedPassword, // Store the hashed password
		})

		// Save the new user to the database
		await newUser.save()

		// Return success response
		return res.status(201).json({
			message: 'User created successfully',
		})
	} catch (err) {
		console.error('Error creating user:', err)
		return res.status(500).json({ message: 'Server error', error: err.message })
	}
}

export const loginUserHandler = async (req, res) => {
	const { username, password } = req.request // Accessing data from the request body

	// Input validation: Ensure both username and password are provided
	if (!username || !password) {
		return res.status(400).json({ message: 'Username and password are required' })
	}

	try {
		// Step 1: Find the user by username
		const user = await User.findOne({ username })
		if (!user) {
			return res.status(404).json({ message: 'User not found' })
		}

		// Step 2: Compare the provided password with the hashed password in the database
		const isMatch = await bcrypt.compare(password, user.password)
		if (!isMatch) {
			return res.status(401).json({ message: 'Invalid credentials' })
		}

		// Step 3: Generate a JWT token if the credentials are correct
		const secretKey = process.env.JWT_SECRET

		// Convert ObjectId to string
		const userIdString = user._id.toString() // Convert ObjectId to string

		const payload = {
			userId: userIdString, // Store userId as a string
			username: user.username,
		}

		console.log(payload) // Logging to ensure the payload is correct

		// Use `SignJWT` to create the JWT token
		const token = await new SignJWT(payload)
			.setProtectedHeader({ alg: 'HS256' }) // Algorithm for signing (HMAC with SHA-256)
			.setIssuedAt() // Issued at claim
			.setExpirationTime('3d') // Expiration time (1 hour in this case)
			.sign(new TextEncoder().encode(secretKey)) // Signing the token with the secret key

		// Step 4: Return the JWT token in the response
		return res.json({
			message: 'Login successful',
			token, // Return the token to the client for future requests
		})
	} catch (err) {
		console.error('Error logging in:', err)
		return res.status(500).json({
			message: 'Server error',
			error: err.message,
		})
	}
}

export const getUserHandler = async (req, res) => {
	try {
		// Extract userId and username from the decoded JWT payload attached to req.account
		const { userId } = req.account

		// Retrieve user data from the database using the userId
		const user = await User.findById(userId)

		// If the user is not found, return an error message
		if (!user) {
			return res.status(404).json({ message: 'User not found' })
		}

		// Return user information
		return res.json({
			message: 'User data retrieved successfully',
			data: user,
		})
	} catch (err) {
		console.error('Error retrieving user data:', err)
		return res.status(500).json({
			message: 'Failed to retrieve user data',
			error: err.message,
		})
	}
}
