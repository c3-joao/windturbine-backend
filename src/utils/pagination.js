/**
 * Pagination utility functions for standardizing API limits and pagination
 */

// Constants for pagination limits
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

/**
 * Validate and normalize pagination parameters
 * @param {Object} query - The request query parameters
 * @param {number} query.page - The page number (optional, defaults to 1)
 * @param {number} query.limit - The limit per page (optional, defaults to DEFAULT_LIMIT)
 * @returns {Object} Normalized pagination parameters
 */
function validatePagination(query = {}) {
  const { page = 1, limit = DEFAULT_LIMIT } = query;
  
  // Validate and constrain page number
  const pageNum = Math.max(1, parseInt(page) || 1);
  
  // Validate and constrain limit
  const limitNum = Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, parseInt(limit) || DEFAULT_LIMIT));
  
  // Calculate offset
  const offset = (pageNum - 1) * limitNum;
  
  return {
    page: pageNum,
    limit: limitNum,
    offset
  };
}

/**
 * Create pagination metadata for API responses
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} Pagination metadata
 */
function createPaginationMeta(page, limit, total) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

/**
 * Validate limit for APIs that don't use full pagination (just limit)
 * @param {number} limit - The requested limit
 * @param {number} defaultLimit - Custom default limit (optional, uses DEFAULT_LIMIT if not provided)
 * @returns {number} Validated and constrained limit
 */
function validateLimit(limit, defaultLimit = DEFAULT_LIMIT) {
  const parsedLimit = parseInt(limit) || defaultLimit;
  return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, parsedLimit));
}

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MIN_LIMIT,
  validatePagination,
  createPaginationMeta,
  validateLimit
};
