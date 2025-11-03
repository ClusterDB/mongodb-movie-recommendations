const config = require('../config');

async function postViewing(req, res) {
  const body = req.body;
  if (req.query.secret !== config.secret) {
    return res.status(403).json({ message: 'Forbidden: Invalid secret' });
  }
  console.log('Received viewing data:', body);
};

module.exports = postViewing;