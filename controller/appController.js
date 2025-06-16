import { connectUserDB } from '../config/db.js'
import Config from '../models/Config.js'
import mongoose from 'mongoose'

// Helper function to validate field types
function validateFieldType(expectedType, value) {
	switch (expectedType) {
		case 'String':
			return typeof value === 'string'
		case 'Number':
			return typeof value === 'number'
		case 'Date':
			return value instanceof Date
		case 'Boolean':
			return typeof value === 'boolean'
		case 'Array':
			return Array.isArray(value)
		case 'Object':
			return typeof value === 'object' && !Array.isArray(value) && value !== null
		case 'Null':
			return value === null
		default:
			return false
	}
}

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

		// Return the collection names along with their schemas
		return res.json({
			message: 'Collection names and schemas fetched successfully',
			data: collectionsWithSchema,
		})
	} catch (err) {
		// Handle errors
		console.error('Error during database connection or query:', err)
		return res.status(500).json({
			message: 'Failed to connect to the database or fetch collections',
			error: err.message,
		})
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
			return res.status(400).json({ message: `Collection '${collection}' already exists in database '${db}'` })
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
		return res.json({
			message: `Collection '${collection}' created successfully in database '${db}' with the defined schema`,
		})
	} catch (err) {
		console.error('Error creating collection or storing config:', err)
		return res.status(500).json({
			message: 'Failed to create the collection or store the schema',
			error: err.message,
		})
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
			return res.status(400).json({ message: `Collection '${collection}' does not exist` })
		}

		// Drop the collection from the user database
		await userConnection.db.collection(collection).drop()

		// Now, remove the config entry from the Config collection
		await Config.deleteOne({ db, collection }) // Delete the schema config for the collection

		// Return success message
		return res.json({ message: `Collection '${collection}' and its schema configuration deleted successfully from database '${db}'` })
	} catch (err) {
		// Handle errors
		console.error('Error during database connection or collection deletion:', err)
		return res.status(500).json({
			message: 'Failed to connect to the database or delete the collection/config',
			error: err.message,
		})
	}
}

export const getDataCollectionHandler = async (req, res) => {
	const { db } = req.query // Collection name
	const { collection } = req.params

	try {
		// Connect to the user database dynamically
		const userConnection = await connectUserDB(db)

		// Check if the collection exists
		const collections = await userConnection.db.listCollections().toArray()
		const collectionNames = collections.map((coll) => coll.name)

		if (!collectionNames.includes(collection)) {
			return res.status(400).json({ message: `Collection '${collection}' does not exist` })
		}

		// Fetch all documents from the collection
		const data = await userConnection.collection(collection).find().toArray()

		// Return the fetched data
		return res.json({ message: 'Data fetched successfully', data })
	} catch (err) {
		console.error('Error fetching data:', err)
		return res.status(500).json({
			message: 'Failed to connect or fetch data from collection',
			error: err.message,
		})
	}
}

export const postDataCollectionHandler = async (req, res) => {
	const { data } = req.body // Collection info and data to insert
	const { collection } = req.params // Collection name from URL params
	const { db } = req.query // Database name from the query string

	try {
		// Connect to the user database dynamically
		const userConnection = await connectUserDB(db)

		// Check if the collection exists in the config collection
		const config = await Config.findOne({ db, collection: collection })
		if (!config) {
			return res.status(400).json({ message: `Collection '${collection}' not found in the config` })
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

		// Validate the data against the schema in the config
		for (const key in data) {
			if (!config.schema[key]) {
				return res.status(400).json({ message: `Field '${key}' is not defined in the schema` })
			}

			const expectedType = config.schema[key].type // Accessing 'type' of the schema
			const actualValue = data[key]

			// Type validation based on the schema type defined in the config
			const isValidType = validateFieldType(expectedType, actualValue)
			if (!isValidType) {
				return res.status(400).json({ message: `Field '${key}' should be of type '${expectedType}'` })
			}

			// Check for uniqueness if the field is unique
			if (config.schema[key].unique) {
				const existingValue = await userConnection.collection(collection).findOne({ [key]: actualValue })
				if (existingValue) {
					return res.status(400).json({ message: `Field '${key}' with value '${actualValue}' must be unique.` })
				}
			}
		}

		// Insert the data into the collection
		const result = await userConnection.collection(collection).insertOne(data)

		// Return success message
		return res.json({
			message: `Data inserted successfully into collection '${collection}'`,
			data: result,
		})
	} catch (err) {
		// Handle duplicate key error for unique fields
		if (err.code === 11000) {
			return res.status(400).json({
				message: 'Duplicate key error: Unique field constraint violated.',
				error: err.message,
			})
		}

		// General error handling
		console.error('Error inserting data into collection:', err)
		return res.status(500).json({
			message: 'Failed to insert data into collection',
			error: err.message,
		})
	}
}

export const updateDataCollectionHandler = async (req, res) => {
	const { collection, db } = req.query // The collection name
	const { dataId, update } = req.body // The filter and update data (dynamic)

	try {
		// Connect to the user database dynamically
		const userConnection = await connectUserDB(db)

		// Check if the collection exists in the database
		const collections = await userConnection.db.listCollections().toArray()
		const collectionNames = collections.map((coll) => coll.name)

		if (!collectionNames.includes(collection)) {
			return res.status(400).json({ message: `Collection '${collection}' does not exist` })
		}

		// Check if the schema exists in the Config collection
		const config = await Config.findOne({ db, collection })
		if (!config) {
			return res.status(400).json({ message: `Collection '${collection}' does not have a defined schema in the config` })
		}

		// Validate the update data against the schema
		for (const key in update) {
			if (!config.schema[key]) {
				return res.status(400).json({ message: `Field '${key}' is not defined in the schema` })
			}

			const expectedType = config.schema[key].type // Get the expected type from the schema
			const actualValue = update[key]

			// Type validation based on the schema type defined in the config
			const isValidType = validateFieldType(expectedType, actualValue)
			if (!isValidType) {
				return res.status(400).json({ message: `Field '${key}' should be of type '${expectedType}'` })
			}

			// If the field is unique, ensure no duplicates exist in the collection
			if (config.schema[key].unique) {
				const existingValue = await userConnection.collection(collection).findOne({ [key]: actualValue })
				if (existingValue) {
					return res.status(400).json({ message: `Field '${key}' with value '${actualValue}' must be unique.` })
				}
			}
		}

		// Update the documents in the collection
		const result = await userConnection.collection(collection).updateMany(dataId, { $set: update })

		// Return success message
		return res.json({
			message: `${result.modifiedCount} document(s) updated in collection '${collection}'`,
		})
	} catch (err) {
		// Check if the error is a duplicate key error (for the unique constraint)
		if (err.code === 11000) {
			return res.status(400).json({
				message: 'Duplicate key error: Unique field constraint violated.',
				error: err.message,
			})
		}

		// Handle other errors
		console.error('Error updating data:', err)
		return res.status(500).json({
			message: 'Failed to update data in collection',
			error: err.message,
		})
	}
}

export const deleteDataCollectionHandler = async (req, res) => {
	const { collection } = req.params // ObjectId from URL parameter
	const { id, db } = req.query // Collection and db from query string

	try {
		// Connect to the user database dynamically using the 'db' query parameter
		const userConnection = await connectUserDB(db)

		// Check if the collection exists in the database
		const collections = await userConnection.db.listCollections().toArray()
		const collectionNames = collections.map((coll) => coll.name)

		// Check if the collection exists
		if (!collectionNames.includes(collection)) {
			return res.status(400).json({ message: `Collection '${collection}' does not exist` })
		}

		// Convert objectId string to ObjectId type (MongoDB expects ObjectId, not string)
		const objectIdConverted = new mongoose.Types.ObjectId(id) // Correct ObjectId conversion

		// Perform the deletion of the document by _id
		const result = await userConnection.collection(collection).deleteOne({ _id: objectIdConverted })

		// Check if the deletion was successful
		if (result.deletedCount === 0) {
			return res.status(404).json({
				message: `No document found with the specified _id: '${id}'`,
			})
		}

		// Return success message
		return res.json({
			message: `1 document deleted from collection '${collection}'`,
			data: result,
		})
	} catch (err) {
		// Handle errors
		console.error('Error deleting data:', err)
		return res.status(500).json({
			message: 'Failed to delete data from collection',
			error: err.message,
		})
	}
}
