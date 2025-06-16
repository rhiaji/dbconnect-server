import express from 'express'
import { createUserHandler, loginUserHandler, getUserHandler } from '../controller/userController.js'
import { jwtVerify } from 'jose'
import { JWT_SECRET } from '../config/config.js'
const router = express()

router.get('/', async (req, res) => {
	try {
		const token = req.headers['x-auth-token']
		if (!token) {
			return res.status(400).json({ message: 'No token provided' })
		}
		const { payload: decoded } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET))
		req.account = decoded
		getUserHandler(req, res)
	} catch (err) {
		console.error('Error during token verification:', err)
		return res.status(401).json({
			message: 'Invalid or expired token',
			error: err.message,
		})
	}
})

router.post('/login', async (req, res) => {
	try {
		const request = req.body.request
		if (!request) {
			return res.status(400).json({ message: 'No request provided' })
		}
		const { payload: decodedRequest } = await jwtVerify(request, new TextEncoder().encode(JWT_SECRET))
		req.request = decodedRequest
		await loginUserHandler(req, res)
	} catch (error) {
		console.error('Error during token verification or user creation:', error)
		return res.status(401).json({ message: 'Invalid or expired token', error: error.message })
	}
})

router.post('/signup', async (req, res) => {
	try {
		const request = req.body.request
		if (!request) {
			return res.status(400).json({ message: 'No request provided' })
		}
		const { payload: decodedRequest } = await jwtVerify(request, new TextEncoder().encode(JWT_SECRET))
		req.request = decodedRequest
		await createUserHandler(req, res)
	} catch (error) {
		console.error('Error during token verification or user creation:', error)
		return res.status(401).json({ message: 'Invalid or expired token', error: error.message })
	}
})

export default router
