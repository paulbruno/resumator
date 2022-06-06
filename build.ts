import { format as dateFormat } from 'date-fns'
import handlebars from 'handlebars'
import { marked } from 'marked'
import { Octokit } from 'octokit'
import yaml from 'yaml'

const { readTextFile, writeTextFile } = Deno
const octokit = new Octokit({ auth: `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` })

const owner = 'paulbruno'
const repo = 'semantic-resume'

console.dir(
  Object.getOwnPropertyNames(octokit.rest.git)
    .filter(
      name =>
        name.indexOf('get') === 0
        ||
        name.indexOf('list') === 0
    )
)
console.dir(
  Object.getOwnPropertyNames(octokit.rest.repos)
    .filter(
      name =>
        name.indexOf('get') === 0
        ||
        name.indexOf('list') === 0
    )
)

const tags = await octokit.rest.repos.listTags({
  owner,
  repo,
})

console.log('tags', tags)

const { data: [{ name: tag }] } = tags

const contents = await octokit.rest.repos.getContent({
  owner,
  repo,
  ref: tag,
  path: 'resume.yaml'
})

console.log('contents', contents)
console.log('decoded contents', atob(contents.data.content))

const helpers: Record<string, (input: string) => string> = {
  extractDomain: (url) => {
    const match = url.match(/^http(?:s)?:\/\/(?:www\.)?([A-Za-z0-9.-]{2,})\//)
    if (!match) {
      throw new Error(`No domain for this url: ${url}`)
    }
    
    return match[1] ?? ''
  },
  extractPath: (url) => {
    const match = url.match(/^http(?:s)?:\/\/(?:www\.)?(?:[A-Za-z0-9.-]{2,})(\/.*)$/)
    if (!match) {
      throw new Error(`No path for this url: ${url}`)
    }
    
    return match[1] ?? ''
  },
  
  formatPhone: (phone: string) => phone.replace(/^\+1\s*/, ''),
  formatDate: (date: string) => date 
    ? dateFormat(new Date(date), 'MMM. Y')
    : '',
  markdown: (text: string) => marked.parseInline(text),
  toLowercase: (input: string) => input.toLowerCase(),
}

for (const name in helpers) {
  handlebars.registerHelper(name, helpers[name])
}

const template = handlebars.compile(await readTextFile('../resume-theme/index.hbs'))
writeTextFile('./index.html', template(yaml.parse(await readTextFile('../semantic-resume/resume.yaml'))))