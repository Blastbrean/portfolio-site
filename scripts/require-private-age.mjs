if (!process.env.PRIVATE_BIRTH_DATE?.trim()) {
  throw new Error('Add the PRIVATE_BIRTH_DATE repository secret in GitHub Actions settings before deploying.');
}
