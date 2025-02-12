const core = require('@actions/core');
const addFormats = require('ajv-formats');
const Ajv2020 = require('ajv/dist/2020');

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  validateFormats: false,
});
addFormats(ajv);

const jsonSchemaSuffix = '_jsonSchema.json';
const jsonInstanceSuffix = '_instance_jsonSchema.json';

async function validateJargonArtefacts(jargonArtefact) {
  try {
    if (!jargonArtefact || !jargonArtefact.artefacts) {
      return core.setFailed('No Jargon artefact payload found.');
    }
    if (jargonArtefact.action && jargonArtefact.action.test) {
      core.info('Jargon artefact is a test action.');
    }

    core.info('Validating Jargon artefacts...');

    const { jsonSchemas = [] } = jargonArtefact.artefacts;
    core.info(`Json Schemas: ${JSON.stringify(jsonSchemas)}`);
    if (jsonSchemas && jsonSchemas.length) {
      core.info('Validating sample credentials...');
      await validateSampleCredentials(jsonSchemas);
      core.info('Sample credentials validation complete.');
    }

    core.info('Jargon artefacts validation complete.');
  } catch (error) {
    core.setFailed(`Error validating Jargon artefacts: ${error.message}`);
  }
}

// JSON-LD context files, [schemas, and sample credentials]

// validate context
function validateJsonLdContext(jsonldContext) {}
// validate sample credentials
async function validateSampleCredentials(jsonSchemas) {
  const schemaAndInstancePairs = await pairSchemasAndInstances(jsonSchemas);
  core.info(`Schema and instance pairs: ${JSON.stringify(schemaAndInstancePairs)}`);

  const results = schemaAndInstancePairs.map(({ schema, instance }) => {
    core.info(`Validating sample credential "${instance.fileName}" against schema "${schema.fileName}"...`);
    const validate = ajv.compile(schema.json);
    const isValid = validate(instance.json);

    // Check if all errors are additionalProperties
    const onlyAdditionalPropertiesErrors = validate?.errors?.every((error) => error.keyword === 'additionalProperties');
    const combinedResult = isValid || onlyAdditionalPropertiesErrors;

    core.info(`Sample credential "${instance.fileName}" validation ${combinedResult ? 'succeeded' : 'failed'}.`);
    return {
      schemaFileName: schema.fileName,
      instanceFileName: instance.fileName,
      valid: combinedResult,
      errors: validate.errors,
    };
  });

  const finalResult = results.every(({ valid }) => valid);
  core.info(`Final sample credentials validation result: ${finalResult ? 'succeeded' : 'failed'}.`);
  if (!finalResult) {
    const errorDetails = results.map(({ errors }) => errors).join('\n');
    return core.setFailed(`Sample credentials validation failed: ${errorDetails}`);
  }
}

async function fetchArtefactData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      core.setFailed(`Failed to fetch ${url}: ${response.statusText}`);
      return null;
    }

    return response.json();
  } catch (error) {
    core.setFailed(`Error fetching artefact data: ${error.message}`);
    return null;
  }
}

function splitSchemasAndInstances(jsonSchemas) {
  const schemas = {};
  const instances = {};

  for (const file of jsonSchemas) {
    if (file.fileName.includes(jsonSchemaSuffix) && !file.fileName.includes('_instance')) {
      schemas[file.fileName] = file.url;
    } else if (file.fileName.includes(jsonInstanceSuffix)) {
      instances[file.fileName] = file.url;
    }
  }

  return { schemas, instances };
}

async function pairSchemasAndInstances(jsonSchemas) {
  const { schemas, instances } = splitSchemasAndInstances(jsonSchemas);
  core.info(`Schemas: ${JSON.stringify(schemas)}`);
  core.info(`Instances: ${JSON.stringify(instances)}`);

  const schemaFileNames = Object.keys(schemas);
  const pairPromises = schemaFileNames.map(async schemaFileName => {
    const baseName = schemaFileName.replace(jsonSchemaSuffix, '');
    const instanceFileName = `${baseName}${jsonInstanceSuffix}`;

    if (!instances[instanceFileName]) {
      core.setFailed(`No instance found for schema "${schemaFileName}".`);
      return null;
    }

    const [schemaJson, instanceJson] = await Promise.all([
      fetchArtefactData(schemas[schemaFileName]),
      fetchArtefactData(instances[instanceFileName])]
    );
    if (!schemaJson || !instanceJson) {
      core.setFailed(`Failed to fetch schema "${schemaFileName}" or instance "${instanceFileName}".`);
      return null;
    }

    core.info(`Fetched schema "${schemaFileName}" and instance "${instanceFileName}".`);

    return { 
      schema: { fileName: schemaFileName, url: schemas[schemaFileName], json: schemaJson },
      instance: { fileName: instanceFileName, url: instances[instanceFileName], json: instanceJson }
    };
  });

  const pairs = await Promise.all(pairPromises); // Fetch all pairs in parallel
  return pairs.filter(pair => pair); // Remove null values
}

async function run() {
  try {
      const jargonArtefactPayload = process.env['INPUT_JARGON-WEBHOOK-PAYLOAD'];
      const jargonArtefact = JSON.parse(jargonArtefactPayload);
      await validateJargonArtefacts(jargonArtefact);
  } catch (error) {
      core.setFailed(`Unexpected error: ${error.message}`);
  }
}

run();
