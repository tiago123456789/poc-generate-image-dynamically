const crypto = require('crypto')

const getEtag = (value) => {
    return crypto.createHash('md5').update(value.toString()).digest("hex")
}

const enableHTTPCache = (res, hash) => {
    res.setHeader('Cache-Control', 'public, max-age=10');
    res.setHeader('Etag', hash);
}

module.exports = {
    getEtag, enableHTTPCache
}