const getCatalog = require('../../lib/catalog.js');

module.exports = async (args = {}) => {
  const { schools, findSchools } = await getCatalog();
  return findSchools(schools, args);
};
