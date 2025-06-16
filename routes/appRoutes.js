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

const router = express()

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
	const { collectionSchema, data } = req.body // Extract schema or data from request body

	try {
		if (collectionSchema) {
			return createCollectionHandler(req, res) // Create collection if schema is provided
		} else if (data) {
			return postDataCollectionHandler(req, res) // Insert data if data is provided
		} else {
			return res.status(400).json({
				message: "Request must contain either 'collectionSchema' for creating a collection or 'data' for inserting data.",
			})
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
	try {
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
