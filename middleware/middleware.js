import { jwtVerify } from 'jose' // Import jwtVerify from jose
import { JWT_SECRET, NODE_ENV } from '../config/config.js' // Secret key for verification

// Middleware to protect routes that require authentication using jwtVerify from jose
export const authMiddleware = async (req, res, next) => {
	const authToken = req.header('x-auth-token') // The new combined authToken header (website token or API key)

	if (!authToken) {
		return res.status(401).json({ message: 'No authToken provided, authorization denied' })
	}

	try {
		// Decode the authToken
		const { payload: decoded } = await jwtVerify(authToken, new TextEncoder().encode(JWT_SECRET))

		// Optional: Disable this log in production
		if (NODE_ENV === 'development') {
			console.log('Decoded Payload from authToken:', decoded)
		}

		// Check the isWebsiteKey flag in the decoded payload
		const { isWebsiteKey } = decoded

		// If the token is valid and belongs to a website request
		if (isWebsiteKey) {
			// Ensure the request is coming from a valid website
			req.isWebsite = true

			// Check the request origin
			const origin = req.header('Origin')
			if (!origin || !isValidWebsiteOrigin(origin)) {
				return res.status(403).json({ message: 'Request not from a valid website' })
			}
		} else {
			// If it's an API request
			req.isWebsite = false
		}

		// Attach the user data to the request object
		req.account = decoded

		// Proceed to the next middleware or route handler
		next()
	} catch (err) {
		// Handle different JWT errors
		if (err.code === 'ERR_JWT_EXPIRED') {
			return res.status(401).json({ message: 'Token has expired' })
		}
		// If any other error occurs (invalid token, malformed token, etc.)
		return res.status(401).json({ message: 'Invalid or expired token' })
	}
}

// Helper function to check if the request is from a valid website origin
function isValidWebsiteOrigin(origin) {
	const allowedOrigins = getAllowedOrigins()

	return allowedOrigins.includes(origin)
}

// Helper function to manage allowed origins
function getAllowedOrigins() {
	let allowedOrigins = []

	if (NODE_ENV === 'production') {
		allowedOrigins = ['https://dbconnect-ten.vercel.app'] // Production domain(s)
	} else {
		allowedOrigins = ['http://localhost:3000'] // Development domain(s)
	}

	// You can add more allowed domains here if needed in the future
	return allowedOrigins
}

export default authMiddleware
