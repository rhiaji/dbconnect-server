// Helper function to validate field types
export const validateFieldType = (expectedType, value) => {
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
