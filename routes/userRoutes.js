import express from 'express'
import {
	createUserHandler,
	loginUserHandler,
	getUserHandler,
	updateUserHandler,
	deleteUserHandler,
	changePasswordHandler,
} from '../controller/userController.js'
import { jwtVerify } from 'jose'
import { JWT_SECRET } from '../config/config.js'

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
router.get('/', async (req, res) => {
	const token = req.headers['x-auth-token']
	if (!token) {
		return sendResponse(res, false, 'No token provided')
	}

	// Verify the token
	const isVerified = await verifyToken(token, req, res)
	if (isVerified) {
		// If verified, get the user data
		await getUserHandler(req, res)
	}
})

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

// Route to update user information
router.put('/update', async (req, res) => {
	const token = req.headers['x-auth-token']
	if (!token) {
		return sendResponse(res, false, 'No token provided')
	}

	// Verify the token
	const isVerified = await verifyToken(token, req, res)
	if (isVerified) {
		// If verified, update the user information
		await updateUserHandler(req, res)
	}
})

// Route to change user password
router.put('/change-password', async (req, res) => {
	const token = req.headers['x-auth-token']
	if (!token) {
		return sendResponse(res, false, 'No token provided')
	}

	// Verify the token
	const isVerified = await verifyToken(token, req, res)
	if (isVerified) {
		// If verified, change the user password
		await changePasswordHandler(req, res)
	}
})

// Route to delete user account
router.delete('/delete', async (req, res) => {
	const token = req.headers['x-auth-token']
	if (!token) {
		return sendResponse(res, false, 'No token provided')
	}

	// Verify the token
	const isVerified = await verifyToken(token, req, res)
	if (isVerified) {
		// If verified, delete the user account
		await deleteUserHandler(req, res)
	}
})

export default router
