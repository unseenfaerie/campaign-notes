const db = require('../db');

// Get item details by item_id
function getItemDetails(item_id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM items WHERE id = ?', [item_id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

module.exports = {
  getItemDetails
};
