import { jwtVerify } from 'jose' // Import jwtVerify from jose
import { JWT_SECRET } from '../config/config.js' // Secret or public key for verification

// Middleware to protect routes that require authentication using jwtVerify from jose
export const authMiddleware = async (req, res, next) => {
	const token = req.header('x-auth-token') // Get the token from the request header
	const request = req.body?.request // This would be the action token

	if (!token) {
		return res.status(401).json({ message: 'No token, authorization denied' })
	}

	try {
		// Verify the token using jwtVerify from jose (HS256 algorithm in this case)
		const { payload: decoded } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET))

		console.log('authMiddleware - Decoded auth payload:', decoded)

		// If there is an action request, verify the request token (action token)
		if (request) {
			const { payload: decodedRequest } = await jwtVerify(request, new TextEncoder().encode(JWT_SECRET))

			console.log('authMiddleware - Decoded request payload:', decodedRequest)

			// Check if the action token has a fresh timestamp
			if (!decodedRequest.iat || !isFreshTimestamp(decodedRequest.iat)) {
				return res.status(403).json({ error: 'Stale or invalid timestamp in action token' })
			}

			req.request = decodedRequest // Attach the decoded request (action token) to the request object
		}

		req.decoded = decoded

		// Move to the next middleware or route handler
		next()
	} catch (err) {
		// Handle different JWT errors
		if (err.code === 'ERR_JWT_EXPIRED') {
			return res.status(401).json({ message: 'Token has expired' })
		}
		return res.status(401).json({ message: 'Token is not valid' })
	}
}

// Helper function to check freshness of timestamp (similar to your existing function)
function isFreshTimestamp(iatSeconds) {
	const nowSeconds = Math.floor(Date.now() / 1000)
	const diff = nowSeconds - iatSeconds
	return diff >= 0 && diff <= 300 // Allow up to 5 minutes
}

export default authMiddleware
