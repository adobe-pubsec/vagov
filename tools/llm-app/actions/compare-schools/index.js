const {
  schools, result, error, isObject,
} = require('../../lib/catalog.js');

module.exports = async (args = {}) => {
  if (!isObject(args) || Object.keys(args).some((key) => key !== 'schoolIds')) {
    return error('Provide schoolIds with two or three distinct IDs from find_schools.');
  }
  const { schoolIds } = args;
  if (!Array.isArray(schoolIds) || schoolIds.length < 2 || schoolIds.length > 3
    || schoolIds.some((id) => typeof id !== 'string' || !schools.some((school) => school.id === id))
    || new Set(schoolIds).size !== schoolIds.length) {
    return error('Choose two or three distinct, known school IDs from find_schools.');
  }
  return result('comparison', { schoolIds }, schoolIds.map((id) => (
    schools.find((school) => school.id === id)
  )));
};
