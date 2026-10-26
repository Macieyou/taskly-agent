import { appendFile, readFile } from 'node:fs/promises'
import { isDocumentationUpdate } from './update-scope.mjs'

const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'))
const documentationOnly = await isDocumentationUpdate(
  event,
  process.env.PR_HEAD,
)
await appendFile(
  process.env.GITHUB_OUTPUT,
  `documentation_only=${documentationOnly}\n`,
)
