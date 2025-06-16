import dotenv from 'dotenv'
dotenv.config()

export const JWT_SECRET = process.env.JWT_SECRET
export const MONGO_URI = process.env.MONGO_URI
export const MONGO_URI_LOCAL = process.env.MONGO_URI_LOCAL
export const USER_URI = process.env.USER_URI
export const USER_URI_LOCAL = process.env.USER_URI_LOCAL
export const NODE_ENV = process.env.NODE_ENV
