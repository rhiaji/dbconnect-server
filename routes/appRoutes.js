import express from 'express'
import {
	getCollectionsHandler,
	createCollectionHandler,
	deleteCollectionHandler,
	getDataCollectionHandler,
	postDataCollectionHandler,
	deleteDataCollectionHandler,
} from '../controller/appController.js'

const router = express()

// Route to fetch all collections
router.get('/:collection', async (req, res) => {
	const { collection } = req.params

	if (collection === 'collection') {
		return getCollectionsHandler(req, res)
	} else {
		return getDataCollectionHandler(req, res)
	}
})

// Dynamic POST handler for collections: Create a collection or add data to an existing collection
router.post('/:collection', async (req, res) => {
	const { collectionSchema, data } = req.body // Schema or data from the request body

	console.log(req.body)

	if (collectionSchema) {
		// If the body contains collection schema, call createCollectionHandler
		return createCollectionHandler(req, res)
	} else if (data) {
		// If the body contains data, call postDataCollectionHandler
		return postDataCollectionHandler(req, res)
	} else {
		// If neither schema nor data is provided, return an error
		return res.status(400).json({
			message: "Request must contain either 'collectionSchema' for creating a collection or 'data' for inserting data.",
		})
	}
})

// Route to delete data from collection by objectId
router.delete('/:collection', async (req, res) => {
	const { id } = req.query

	if (id) {
		return deleteDataCollectionHandler(req, res)
	} else {
		return deleteCollectionHandler(req, res)
	}
})

export default router
