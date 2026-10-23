const schools = require('./schools.json');

const DISCLAIMER = 'School names and data are illustrative, not verified institution information. Confirm school approval, tuition, and Yellow Ribbon participation with VA. Eligibility and benefit amounts are not determined here.';
const OFFICIAL_TOOL = 'https://www.va.gov/education/gi-bill-comparison-tool/';

function result(mode, args, records) {
  return {
    content: [{
      type: 'text',
      text: `${mode === 'search' ? 'Found' : 'Comparing'} ${records.length} schools. ${DISCLAIMER} Official VA GI Bill Comparison Tool: ${OFFICIAL_TOOL}`,
    }],
    structuredContent: {
      mode,
      arguments: args,
      records,
      illustrativeData: true,
      disclaimer: DISCLAIMER,
    },
  };
}

function error(text) {
  return {
    isError: true,
    content: [{ type: 'text', text }],
    structuredContent: {
      records: [], illustrativeData: true, disclaimer: DISCLAIMER,
    },
  };
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

module.exports = {
  schools, result, error, isObject,
};
