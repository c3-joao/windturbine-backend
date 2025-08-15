/**
 * Utility to normalize query parameter keys to be case-insensitive
 * Maps user input to the expected parameter names used in the API
 */

/**
 * Normalize query parameter keys to handle case-insensitive input
 * @param {Object} query - The req.query object
 * @param {Array} expectedParams - Array of expected parameter names (in correct case)
 * @returns {Object} - Normalized query object with correct parameter names
 */
function normalizeQueryParams(query, expectedParams) {
  const normalized = {};
  
  // Create a lowercase mapping of expected parameters
  const paramMap = {};
  expectedParams.forEach(param => {
    paramMap[param.toLowerCase()] = param;
  });
  
  // Normalize each query parameter
  Object.keys(query).forEach(key => {
    const lowerKey = key.toLowerCase();
    const normalizedKey = paramMap[lowerKey] || key; // Use normalized key if found, otherwise keep original
    normalized[normalizedKey] = query[key];
  });
  
  return normalized;
}

/**
 * Express middleware to normalize query parameters
 * @param {Array} expectedParams - Array of expected parameter names
 * @returns {Function} - Express middleware function
 */
function createQueryNormalizer(expectedParams) {
  return (req, res, next) => {
    req.query = normalizeQueryParams(req.query, expectedParams);
    next();
  };
}

module.exports = {
  normalizeQueryParams,
  createQueryNormalizer
};
