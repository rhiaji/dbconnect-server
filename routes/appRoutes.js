import express from 'express'
import {
	getCollectionsHandler,
	createCollectionHandler,
	deleteCollectionHandler,
	getDataCollectionHandler,
	postDataCollectionHandler,
	updateDataCollectionHandler,
	deleteDataCollectionHandler,
} from '../controller/appController.js'
import { jwtVerify } from 'jose' // For JWT verification
import User from '../models/User.js' // Assuming you have a User model to fetch user data

const router = express()

// Helper function to decrypt the data if encrypted is true
const decryptData = async (encryptedData, secretKey) => {
	// Decrypt the data using your decryption logic, assuming it's a JWT or other format
	// Implement decryption logic here (Example shown with jose)
	try {
		const { payload } = await jwtVerify(encryptedData, new TextEncoder().encode(secretKey))
		return payload // Return the decrypted data
	} catch (err) {
		throw new Error('Error decrypting data')
	}
}

// Route to fetch all collections or data from a collection
router.get('/:collection', async (req, res) => {
	const { collection } = req.params
	try {
		if (collection === 'collection') {
			return getCollectionsHandler(req, res) // Fetch collections if 'collection' is the parameter
		} else {
			return getDataCollectionHandler(req, res) // Fetch data if the collection name is provided
		}
	} catch (err) {
		console.error('Error fetching collection or data:', err)
		return res.status(500).json({
			message: 'Failed to fetch collection or data',
			error: err.message,
		})
	}
})

// Dynamic POST handler: Create a collection or add data to an existing collection
router.post('/:collection', async (req, res) => {
	const { collectionSchema } = req.body // Extract schema or data from request body

	console.log(req.body)

	try {
		if (collectionSchema) {
			// If schema is provided, create a new collection
			return createCollectionHandler(req, res)
		} else {
			// If data is provided, check if it's encrypted
			let { data, encrypted } = req.body.data

			console.log(req.body)
			if (encrypted) {
				// Retrieve the user secretKey
				const { userId } = req.account // Assuming the userId is available from JWT (req.account)
				const user = await User.findById(userId)
				if (!user) {
					return res.status(400).json({ message: 'User not found' })
				}

				const secretKey = user.secretKey // Retrieve the secretKey from user data

				// Decrypt the data if encrypted
				const decrypted = await decryptData(data, secretKey)

				// Assign the decrypted data to req.data
				req.data = decrypted.data
			} else {
				// If not encrypted, just use the provided data
				req.data = data
			}

			// After handling the encryption/decryption, insert the data into the collection
			return postDataCollectionHandler(req, res)
		}
	} catch (err) {
		console.error('Error processing POST request:', err)
		return res.status(500).json({
			message: 'Failed to process request',
			error: err.message,
		})
	}
})

// PUT handler to update data in a collection
router.put('/:collection', async (req, res) => {
	let { data, encrypted } = req.body.data // Extract data from request body

	try {
		// Check if the data is encrypted
		if (encrypted) {
			// Retrieve the user secretKey
			const { userId } = req.account // Assuming the userId is available from JWT (req.account)
			const user = await User.findById(userId)
			if (!user) {
				return res.status(400).json({ message: 'User not found' })
			}

			const secretKey = user.secretKey // Retrieve the secretKey from user data

			// Decrypt the data if encrypted
			const decrypted = await decryptData(data, secretKey)

			req.data = decrypted.data
		} else {
			req.data = data
		}

		return updateDataCollectionHandler(req, res)
	} catch (err) {
		console.error('Error updating data:', err)
		return res.status(500).json({
			message: 'Failed to update data in collection',
			error: err.message,
		})
	}
})

// DELETE handler: Delete data or the collection
router.delete('/:collection', async (req, res) => {
	const { id } = req.query

	try {
		if (id) {
			// If 'id' is provided, delete data by objectId
			return deleteDataCollectionHandler(req, res)
		} else {
			// If no 'id' is provided, delete the entire collection
			return deleteCollectionHandler(req, res)
		}
	} catch (err) {
		console.error('Error deleting data or collection:', err)
		return res.status(500).json({
			message: 'Failed to delete data or collection',
			error: err.message,
		})
	}
})

export default router
