const {
  schools, result, error, isObject,
} = require('../../lib/catalog.js');

module.exports = async (args = {}) => {
  if (!isObject(args) || Object.keys(args).some((key) => !['query', 'state', 'format'].includes(key))) {
    return error('Use only query, state, and format to search schools.');
  }
  const { query = '', state = '', format = '' } = args;
  if (typeof query !== 'string' || query.length > 100) {
    return error('Use a program or school search of at most 100 characters.');
  }
  if (typeof state !== 'string' || !['', 'VA', 'MD', 'DC'].includes(state)) {
    return error('Choose VA, MD, or DC, or omit state to search all locations.');
  }
  if (typeof format !== 'string' || !['', 'in-person', 'hybrid', 'online'].includes(format)) {
    return error('Choose in-person, hybrid, or online, or omit format.');
  }

  const normalizedQuery = query.trim().toLowerCase();
  const records = schools.filter((school) => {
    const searchable = [school.name, school.city, ...school.programs].join(' ').toLowerCase();
    return (!normalizedQuery || searchable.includes(normalizedQuery))
      && (!state || school.state === state)
      && (!format || school.formats.includes(format));
  });
  return result('search', { query: query.trim(), state, format }, records);
};
