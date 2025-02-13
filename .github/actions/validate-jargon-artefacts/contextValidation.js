const core = require('@actions/core');
const jsonld = require('jsonld');
const { splitSchemasAndInstances } = require('./schemaValidation');
const { fetchArtefactData } = require('./utils');

// validate context
async function validateContext (jsonldContext) {
  try {
    return await jsonld.expand(jsonldContext);
  } catch (error) {
    core.setFailed(`Error validating context: ${JSON.stringify(error)}`);
  }
}

async function validateContextInCredential (jsonSchemas) {
  const { instances } = splitSchemasAndInstances(jsonSchemas);
  const instanceFileNames = Object.keys(instances);

  // Fetch all instances in parallel
  const fetchedInstances = await Promise.all(instanceFileNames.map(async instanceFileName => {
    const instanceJson = await fetchArtefactData(instances[instanceFileName]);

    return {
      fileName: instanceFileName,
      url: instances[instanceFileName],
      json: instanceJson,
    }
  }));

  try {
    // Expand all fetched instances
    await Promise.all(
      fetchedInstances.map(async ({ json }) => jsonld.expand(json, { safe: true }))
    );
  } catch (error) {
    core.setFailed(`Error validating context in credentials: ${JSON.stringify(error)}`);
  }
}

module.exports = { validateContext, validateContextInCredential };