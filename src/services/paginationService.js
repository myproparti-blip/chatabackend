/**
 * Pagination utility service
 */

/**
 * Parse and validate pagination parameters
 * @param {number} page - Current page number (default: 1)
 * @param {number} limit - Items per page (default: 10, max: 100)
 * @returns {object} - { page, limit, skip }
 */
export const getPaginationParams = (page = 1, limit = 10) => {
  const parsedPage = Math.max(1, parseInt(page) || 1)
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 10))
  const skip = (parsedPage - 1) * parsedLimit

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip,
  }
}

/**
 * Build pagination metadata
 * @param {number} total - Total document count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {object} - Pagination metadata
 */
export const buildPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit)
  
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  }
}

/**
 * Execute paginated query
 * @param {Model} model - Mongoose model
 * @param {object} filter - Query filter
 * @param {object} options - Query options (select, sort, populate, lean, etc.)
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {object} - { data, pagination }
 */
export const executePaginatedQuery = async (
  model,
  filter = {},
  options = {},
  page = 1,
  limit = 10
) => {
  const { page: parsedPage, limit: parsedLimit, skip } = getPaginationParams(page, limit)

  // Use lean by default for better performance (unless populate is needed)
  const useLean = options.lean !== false && !options.populate

  // Parallel execution: count and fetch data simultaneously
  const [total, data] = await Promise.all([
    model.countDocuments(filter),
    buildAndExecuteQuery(model, filter, options, skip, parsedLimit, useLean),
  ])

  // Build pagination metadata
  const pagination = buildPaginationMeta(total, parsedPage, parsedLimit)

  return {
    data,
    pagination,
  }
}

/**
 * Build and execute mongoose query with options
 * @private
 */
async function buildAndExecuteQuery(
  model,
  filter,
  options,
  skip,
  limit,
  useLean
) {
  let query = model.find(filter)

  // Apply select
  if (options.select) {
    query = query.select(options.select)
  }

  // Apply sort
  if (options.sort) {
    query = query.sort(options.sort)
  }

  // Apply populate (mutually exclusive with lean)
  if (options.populate) {
    query = query.populate(options.populate)
  }

  // Apply lean for better performance (returns plain JS objects)
  // Safe here because executePaginatedQuery is only used for GET operations
  if (useLean) {
    query = query.lean()
  }

  // Apply pagination
  query = query.skip(skip).limit(limit)

  return query.exec()
}
