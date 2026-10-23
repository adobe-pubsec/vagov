const getCatalog = require('../../lib/catalog.js');

module.exports = async (args = {}) => {
  const { schools, compareSchools } = await getCatalog();
  return compareSchools(schools, args);
};
