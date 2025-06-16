import mongoose from 'mongoose'
const { Schema } = mongoose

const configSchema = new Schema(
	{
		db: { type: String, required: true },
		collection: { type: String, required: true },
		schema: { type: Object, required: true },
	},
	{
		timestamps: true,
		suppressReservedKeysWarning: true, // Suppress the warning for using the reserved "collection" field
	}
)

// Add a compound index to enforce uniqueness on (db, collection)
configSchema.index({ db: 1, collection: 1 }, { unique: true })

export default mongoose.models.Config || mongoose.model('Config', configSchema)
