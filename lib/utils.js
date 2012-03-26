/**
 * Return a SHA1 hash digest
 * @param data
 */
function getHash(data) {
	var crypto = require('crypto');
	return crypto.createHash('sha1').update(data).digest('hex');
}

module.exports = {
	getHash: getHash
};
