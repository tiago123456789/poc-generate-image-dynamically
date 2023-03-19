const crypto = require('crypto')

const generateToken = (value) => {
    return crypto.createHash('sha256').update(value).digest('hex')
}

module.exports = {
    generateToken
}
