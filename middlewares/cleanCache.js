const { clearHash } = require('../services/cache');

module.exports = async (req, res, next) => {
    // we have to make sure that after a route handler is
    // completed, the execution is come back to this function
    await next();
    clearHash(req.user.id);
}