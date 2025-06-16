import mongoose from 'mongoose'
const { Schema } = mongoose

const configSchema = new Schema(
	{
		db: { type: String, required: true },
		collection: { type: String, required: true },
		schema: { type: Object, required: true },
	},
	{ timestamps: true }
)

export default mongoose.models.Config || mongoose.model('Config', configSchema)
