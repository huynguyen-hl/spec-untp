import core from '@actions/core';
import addFormats from 'ajv-formats';
import Ajv2020 from 'ajv/dist/2020';

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
    if (!jargonArtefactPayload) {
      return core.setFailed('No Jargon artefact payload found.');
    }
    if (jargonArtefact.action && jargonArtefact.action.test) {
      core.info('Jargon artefact is a test action.');
    }

    core.info('Validating Jargon artefacts...');
    if (jargonArtefact.jsonSchemas && jargonArtefact.jsonSchemas.length) {
      await validateSampleCredentials(jargonArtefact.jsonSchemas);
    }

  } catch (error) {
    core.setFailed(`Error validating Jargon artefacts: ${error.message}`);
  }
}

// JSON-LD context files, [schemas, and sample credentials]

// validate context
function validateJsonLdContext(jsonldContext) {}
// validate sample credentials
async function validateSampleCredentials(jsonSchemas = []) {
  const schemaAndInstancePairs = await pairSchemasAndInstances(jsonSchemas);

  const results = schemaAndInstancePairs.map(({ schema, instance }) => {
    const validate = ajv.compile(schema);
    const isValid = validate(instance);

    // Check if all errors are additionalProperties
    const onlyAdditionalPropertiesErrors = validate.errors.every((error) => error.keyword === 'additionalProperties');

    return {
      valid: isValid || onlyAdditionalPropertiesErrors,
      errors: validate.errors,
    };
  });

  const finalResult = results.every(({ valid }) => valid);
  if (!finalResult) {
    const errorDetails = results.map(({ errors }) => errors).join('\n');
    core.setFailed(`Sample credentials validation failed: ${errorDetails}`);
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

  const schemaFileNames = Object.keys(schemas);
  const pairPromises = schemaFileNames.map(async schemaFileName => {
    const baseName = schemaFileName.replace(jsonSchemaSuffix, '');
    const instanceFileName = `${baseName}${jsonInstanceSuffix}`;

    if (!instances[instanceFileName]) {
      return null;
    }

    const [schemaJson, instanceJson] = await Promise.all([
      fetchArtefactData(schemas[schemaFileName]),
      fetchArtefactData(instances[instanceFileName])]
    );
    if (schemaJson || instanceJson) {
      return null;
    }

    return { schema: schemaJson, instance: instanceJson };
  });

  const pairs = await Promise.all(pairPromises); // Fetch all pairs in parallel
  return pairs.filter(pair => pair); // Remove null values
}

async function run() {
  try {
      core.info(`Raw Payload: ${jargonArtefactPayload}`); // Debugging log
      core.info(`typeof jargonArtefactPayload: ${typeof jargonArtefactPayload}`);

      const jargonArtefactPayload = process.env['INPUT_JARGON-WEBHOOK-PAYLOAD'];
      const jargonArtefact = JSON.parse(jargonArtefactPayload);
      await validateJargonArtefacts(jargonArtefact);
  } catch (error) {
      core.setFailed(`Unexpected error: ${error.message}`);
  }
}

run();
