import { connectUserDB } from '../config/db.js'
import Config from '../models/Config.js'
import mongoose from 'mongoose'
import { sendResponse } from '../utils/responseHelper.js'
import { validateFieldType } from '../utils/validationHelper.js'

export const getCollectionsHandler = async (req, res) => {
	const { db } = req.query // Retrieve the db name from query params

	try {
		// Connect to the user database dynamically using the 'db' query parameter
		const userConnection = await connectUserDB(db)

		// Fetch all collections from the user database connection
		const collections = await userConnection.db.listCollections().toArray()

		// Extract only the names of the collections
		const collectionNames = collections.map((coll) => coll.name)

		// Fetch the schema for each collection from the Config model (dbconnect)
		const collectionsWithSchema = await Promise.all(
			collectionNames.map(async (collectionName) => {
				// Get the schema for each collection
				const config = await Config.findOne({ db: db, collection: collectionName }).lean()

				// Return the collection name along with its schema
				return {
					name: collectionName,
					schema: config ? config.schema : null, // If config is not found, set schema as null
				}
			})
		)

		// Return the response with the updated structure
		return sendResponse(res, true, 'Collection names and schemas fetched successfully', db, 'collections', 'GET', collectionsWithSchema)
	} catch (err) {
		// Handle errors
		console.error('Error during database connection or query:', err)
		return sendResponse(res, false, 'Failed to connect to the database or fetch collections', db, 'collections', 'GET', { error: err.message })
	}
}

export const createCollectionHandler = async (req, res) => {
	const { collectionSchema } = req.body // Schema in the request body
	const { collection } = req.params // Collection name from URL params
	const { db } = req.query // Database name from the query string

	try {
		// Connect to the user database dynamically
		const userConnection = await connectUserDB(db)

		// Check if the combination of db and collectionName already exists in the config collection
		const existingConfig = await Config.findOne({ db, collection: collection })
		if (existingConfig) {
			return sendResponse(res, false, `Collection '${collection}' already exists in database '${db}'`, db, collection, 'POST', {})
		}

		// Add createdAt and updatedAt fields to the schema
		const modifiedSchema = {
			...collectionSchema, // Spread the existing schema fields
			createdAt: { type: 'Date' },
			updatedAt: { type: 'Date' },
		}

		// Save the schema to the config collection for future reference
		const newConfig = new Config({ db, collection: collection, schema: modifiedSchema })
		await newConfig.save()

		// Create the new collection dynamically in the database
		// MongoDB will create the collection when the first document is inserted.
		await userConnection.db.createCollection(collection)

		// Return success response
		return sendResponse(
			res,
			true,
			`Collection '${collection}' created successfully in database '${db}' with the defined schema`,
			db,
			collection,
			'POST',
			{}
		)
	} catch (err) {
		console.error('Error creating collection or storing config:', err)
		return sendResponse(res, false, 'Failed to create the collection or store the schema', db, collection, 'POST', { error: err.message })
	}
}

export const deleteCollectionHandler = async (req, res) => {
	const { collection } = req.params // Collection name from URL parameter
	const { db } = req.query // Database name from query string

	try {
		// Connect to the user database dynamically using the 'db' query parameter
		const userConnection = await connectUserDB(db)

		// Check if the collection exists in the database
		const collections = await userConnection.db.listCollections().toArray()
		const collectionNames = collections.map((coll) => coll.name)

		// If the collection does not exist, return an error message
		if (!collectionNames.includes(collection)) {
			return sendResponse(res, false, `Collection '${collection}' does not exist`, db, collection, 'DELETE', {})
		}

		// Drop the collection from the user database
		await userConnection.db.collection(collection).drop()

		// Now, remove the config entry from the Config collection
		await Config.deleteOne({ db, collection }) // Delete the schema config for the collection

		// Return success message
		return sendResponse(
			res,
			true,
			`Collection '${collection}' and its schema configuration deleted successfully from database '${db}'`,
			db,
			collection,
			'DELETE',
			{}
		)
	} catch (err) {
		// Handle errors
		console.error('Error during database connection or collection deletion:', err)
		return sendResponse(res, false, 'Failed to connect to the database or delete the collection/config', db, collection, 'DELETE', {
			error: err.message,
		})
	}
}

export const getDataCollectionHandler = async (req, res) => {
	const { db } = req.query // Database name
	const { collection } = req.params // Collection name
	const page = parseInt(req.query.page) || 1 // Get the current page, default to 1 if not provided
	const limit = parseInt(req.query.limit) || 100 // Get the limit, default to 100 if not provided

	try {
		// Connect to the user database dynamically
		const userConnection = await connectUserDB(db)

		// Check if the collection exists
		const collections = await userConnection.db.listCollections().toArray()
		const collectionNames = collections.map((coll) => coll.name)

		if (!collectionNames.includes(collection)) {
			return sendResponse(res, false, `Collection '${collection}' does not exist`, db, collection, 'GET', {})
		}

		// Fetch the total number of documents in the collection
		const totalDocuments = await userConnection.collection(collection).countDocuments()

		// Fetch paginated documents from the collection
		const data = await userConnection
			.collection(collection)
			.find()
			.skip((page - 1) * limit) // Skip documents based on the page number
			.limit(limit) // Limit the number of documents per page
			.toArray()

		// Pagination information
		const pagination = {
			page,
			limit,
			total: totalDocuments,
			hasMore: page * limit < totalDocuments, // Check if there's more data
		}

		// Return the response with the new structure
		return sendResponse(res, true, `Successfully fetched data from collection '${collection}'`, db, collection, 'GET', {
			data,
			pagination,
		})
	} catch (err) {
		console.error('Error fetching data:', err)
		return sendResponse(res, false, `Failed to connect or fetch data from collection '${collection}'`, db, collection, 'GET', {
			error: err.message,
		})
	}
}

export const postDataCollectionHandler = async (req, res) => {
	const { data } = req.body // Data to insert into the collection
	const { collection } = req.params // Collection name from URL params
	const { db } = req.query // Database name from the query string

	try {
		// Connect to the user database dynamically
		const userConnection = await connectUserDB(db)

		// Check if the collection exists in the config collection
		const config = await Config.findOne({ db, collection: collection })
		if (!config) {
			return sendResponse(res, false, `Collection '${collection}' not found in the config`, collection, 'POST', {})
		}

		// Ensure createdAt and updatedAt are present, if not, set them
		if (!data.createdAt) {
			data.createdAt = new Date() // Set current date if not provided
		} else if (typeof data.createdAt === 'string') {
			data.createdAt = new Date(data.createdAt) // Convert string to Date object
		}

		if (!data.updatedAt) {
			data.updatedAt = new Date() // Set current date if not provided
		} else if (typeof data.updatedAt === 'string') {
			data.updatedAt = new Date(data.updatedAt) // Convert string to Date object
		}

		// Insert the data into the collection
		const result = await userConnection.collection(collection).insertOne(data)

		// Return success message with the new structure
		return sendResponse(res, true, `Data inserted successfully into collection '${collection}'`, db, collection, 'POST', { result })
	} catch (err) {
		// Handle duplicate key error for unique fields
		if (err.code === 11000) {
			return sendResponse(res, false, `Duplicate key error: Unique field constraint violated.`, collection, 'POST', { error: err.message })
		}

		// General error handling
		console.error('Error inserting data into collection:', err)
		return sendResponse(res, false, `Failed to insert data into collection '${collection}'`, collection, 'POST', { error: err.message })
	}
}

export const updateDataCollectionHandler = async (req, res) => {
	const { db, id } = req.query // Database name and ID
	const { collection } = req.params // Collection name
	const { data } = req.body // Data to update

	try {
		// Connect to the user database dynamically
		const userConnection = await connectUserDB(db)

		// Check if the collection exists in the database
		const collections = await userConnection.db.listCollections().toArray()
		const collectionNames = collections.map((coll) => coll.name)

		if (!collectionNames.includes(collection)) {
			return sendResponse(res, false, `Collection '${collection}' does not exist`, db, collection, 'PUT', {})
		}

		// Check if the schema exists in the Config collection
		const config = await Config.findOne({ db, collection })
		if (!config) {
			return sendResponse(res, false, `Collection '${collection}' does not have a defined schema in the config`, db, collection, 'PUT', {})
		}

		// Validate the update data against the schema
		for (const key in data) {
			if (!config.schema[key]) {
				return sendResponse(res, false, `Field '${key}' is not defined in the schema`, db, collection, 'PUT', {})
			}

			const expectedType = config.schema[key].type // Get the expected type from the schema
			const actualValue = data[key]

			// Type validation based on the schema type defined in the config
			const isValidType = validateFieldType(expectedType, actualValue)
			if (!isValidType) {
				return sendResponse(res, false, `Field '${key}' should be of type '${expectedType}'`, db, collection, 'PUT', {})
			}

			// If the field is unique, ensure no duplicates exist in the collection
			if (config.schema[key].unique) {
				const existingValue = await userConnection.collection(collection).findOne({ [key]: actualValue })
				if (existingValue) {
					return sendResponse(res, false, `Field '${key}' with value '${actualValue}' must be unique.`, db, collection, 'PUT', {})
				}
			}
		}

		// Convert objectId string to ObjectId type (MongoDB expects ObjectId, not string)
		const objectIdConverted = new mongoose.Types.ObjectId(id)

		// Update the documents in the collection
		const result = await userConnection.collection(collection).updateOne({ _id: objectIdConverted }, { $set: data })

		// Return success message with the new structure
		return sendResponse(res, true, `${result.modifiedCount} document(s) updated in collection '${collection}'`, db, collection, 'PUT', {
			data: result,
			updated: { ...data },
		})
	} catch (err) {
		console.error('Error updating data:', err)
		return sendResponse(res, false, `Failed to update data in collection '${collection}'`, db, collection, 'PUT', { error: err.message })
	}
}

export const deleteDataCollectionHandler = async (req, res) => {
	const { collection } = req.params
	const { id, db } = req.query
	try {
		const userConnection = await connectUserDB(db)

		// Check if the collection exists in the database
		const collections = await userConnection.db.listCollections().toArray()
		const collectionNames = collections.map((coll) => coll.name)

		// Check if the collection exists
		if (!collectionNames.includes(collection)) {
			return sendResponse(res, false, `Collection '${collection}' does not exist`, db, collection, 'DELETE', {})
		}

		// Convert objectId string to ObjectId type (MongoDB expects ObjectId, not string)
		const objectIdConverted = new mongoose.Types.ObjectId(id)

		// Perform the deletion of the document by _id
		const result = await userConnection.collection(collection).deleteOne({ _id: objectIdConverted })

		// Check if the deletion was successful
		if (result.deletedCount === 0) {
			return sendResponse(res, false, `No document found with the specified _id: '${id}'`, db, collection, 'DELETE', {})
		}

		// Return success message with the new structure
		return sendResponse(res, true, `1 document deleted from collection '${collection}'`, db, collection, 'DELETE', { data: result })
	} catch (err) {
		console.error('Error deleting data:', err)
		return sendResponse(res, false, `Failed to delete data from collection '${collection}'`, db, collection, 'DELETE', { error: err.message })
	}
}
