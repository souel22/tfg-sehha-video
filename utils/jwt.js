const jwt = require('jsonwebtoken');

// Read public key
const publicKey = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');

const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

module.exports = { verifyToken };
