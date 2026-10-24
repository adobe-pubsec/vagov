const schools = require('../../../scripts/gi-bill-schools.json');

module.exports = async () => {
  const catalog = await import('../../../scripts/gi-bill-catalog.mjs');
  return { schools, ...catalog };
};
