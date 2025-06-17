import express from 'express'
import {
	createUserHandler,
	loginUserHandler,
	getUserHandler,
	updateUserHandler,
	deleteUserHandler,
	changePasswordHandler,
	requestAuthKey,
} from '../controller/userController.js'
import { jwtVerify } from 'jose'
import { JWT_SECRET } from '../config/config.js'
import authMiddleware from '../middleware/middleware.js'

// Helper function to verify JWT and attach the decoded payload to the request object
const verifyToken = async (token, req, res) => {
	try {
		const { payload: decoded } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET))
		req.account = decoded
		return true
	} catch (err) {
		console.error('Error during token verification:', err)
		return sendResponse(res, false, 'Invalid or expired token', { error: err.message })
	}
}

// Helper function for sending consistent responses
function sendResponse(res, success, message, data = {}) {
	return res.json({
		success,
		message,
		data,
	})
}

const router = express()

// Route to get user information
router.get('/', authMiddleware, getUserHandler)

// Route to update user information
router.put('/update', authMiddleware, updateUserHandler)

// Route to change user password
router.put('/change-password', authMiddleware, changePasswordHandler)

// Route to delete user account
router.delete('/delete', authMiddleware, deleteUserHandler)

// Route to request authorization key
router.put('/auth-key', authMiddleware, requestAuthKey)

// Route to login the user
router.post('/login', async (req, res) => {
	const request = req.body.data

	if (!request) {
		return sendResponse(res, false, 'No request provided')
	}

	// Verify the token in the request
	const isVerified = await verifyToken(request, req, res)
	if (isVerified) {
		// If verified, log the user in
		await loginUserHandler(req, res)
	}
})

// Route to sign up a new user
router.post('/signup', async (req, res) => {
	const request = req.body.data

	if (!request) {
		return sendResponse(res, false, 'No request provided')
	}

	// Verify the token in the request
	const isVerified = await verifyToken(request, req, res)
	if (isVerified) {
		// If verified, create the new user
		await createUserHandler(req, res)
	}
})

export default router
