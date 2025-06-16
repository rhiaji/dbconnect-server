// Helper function for sending consistent responses
export function sendResponse(res, success, message, db, collection, method, data) {
	return res.json({
		success, // true or false indicating success/failure
		message, // message describing the result of the operation
		data: {
			database: db,
			collection, // name of the collection
			method, // HTTP method (GET, POST, etc.)
			data, // actual data to be returned
			meta: {
				timestamp: new Date().toISOString(),
				version: '1.0.0',
				apiVersion: 'v1',
			},
		},
	})
}
