const core = require('@actions/core');

async function validateJargonArtefacts(jargonArtefact) {
  try {
    if (jargonArtefact.action && jargonArtefact.action.test) {
      return core.info('Jargon artefact is a test action. Skipping validation.');
    }

    core.info('Validating Jargon artefacts...');
  } catch (error) {
    core.setFailed(`Error validating Jargon artefacts: ${error.message}`);
  }
}

async function run() {
  try {
      const jargonArtefactPayload = core.getInput('jargon-webhook-payload');
      const jargonArtefact = JSON.parse(jargonArtefactPayload);
      await validateJargonArtefacts(jargonArtefact);
  } catch (error) {
      core.setFailed(`Unexpected error: ${error.message}`);
  }
}

run();
