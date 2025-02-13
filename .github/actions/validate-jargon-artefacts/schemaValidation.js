const core = require('@actions/core');
const addFormats = require('ajv-formats');
const Ajv2020 = require('ajv/dist/2020');
const { fetchArtefactData } = require('./utils');

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  validateFormats: false,
});
addFormats(ajv);

const jsonSchemaSuffix = '_jsonSchema.json';
const jsonInstanceSuffix = '_instance_jsonSchema.json';

// validate sample credentials
export async function validateCredentialsSchemas(jsonSchemas) {
  const schemaAndInstancePairs = await pairSchemasAndInstances(jsonSchemas);

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
      schemaUrl: schema.url,
      instanceFileName: instance.fileName,
      instanceUrl: instance.url,
      valid: combinedResult,
      errors: validate.errors,
    };
  });

  const finalResult = results.every(({ valid }) => valid);
  core.info(`Final sample credentials validation result: ${finalResult ? 'succeeded' : 'failed'}.`);
  if (!finalResult) {
    return core.setFailed(`Sample credentials validation failed: ${JSON.stringify(results)}`);
  }
}

export async function pairSchemasAndInstances(jsonSchemas) {
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
      fetchArtefactData(instances[instanceFileName])
    ]);
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

export function splitSchemasAndInstances(jsonSchemas) {
  const schemas = {};
  const instances = {};

  for (const schema of jsonSchemas) {
    if (schema.fileName.includes(jsonSchemaSuffix) && !schema.fileName.includes('_instance')) {
      schemas[schema.fileName] = schema.url;
    } else if (schema.fileName.includes(jsonInstanceSuffix)) {
      instances[schema.fileName] = schema.url;
    }
  }

  return { schemas, instances };
}