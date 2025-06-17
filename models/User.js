import mongoose from 'mongoose'
const { Schema } = mongoose

const userSchema = new Schema(
	{
		username: { type: String, required: true, unique: true },
		email: { type: String, required: true, unique: true },
		password: { type: String, required: true },
		secretKey: { type: String, default: '' },
		authorizationKey: { type: String, default: '' },
		db: { type: String, enum: ['dbconnect1', 'dbconnect2'], required: true, default: 'dbconnect1' },
	},
	{
		timestamps: true,
	}
)

export default mongoose.models.User || mongoose.model('User', userSchema)
