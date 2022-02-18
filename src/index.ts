import { Editor, MarkdownView, Notice, Plugin } from 'obsidian'
import { Octokit } from '@octokit/rest'
import GistSyncSettingTab from './settings'
import { FrontMatter, getFrontMatter } from './utils'
import NoteLinkTransformer from './noteLinkTransformer'

interface PluginSettings {
	token: string
}

const DEFAULT_SETTINGS: PluginSettings = {
	token: ''
}

export default class PublishGistPlugin extends Plugin {
	settings: PluginSettings
	githubInterface?: Octokit
	authenticated: boolean = false

	async onload() {
		await this.loadSettings()

		this.createGithubConnection()

		this.addCommand({
			id: 'publish-gist',
			name: 'Publish file to Github gist',
			editorCallback: async (editor) => {
				if (this.githubInterface != null) {
					try {
						await this.makeRequest(editor)
						new Notice('Created successfully!')
					} catch (err) {
						new Notice(`Github API error: ${err.message}`)
					}
				} else {
					new Notice('No Github token')
				}
			}
		})

		this.addSettingTab(new GistSyncSettingTab(this.app, this))
	}

	async makeRequest(editor: Editor) {
		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView)
		const file = markdownView.file

		let content = await this.app.vault.read(file)

		const frontmatter = getFrontMatter(this.app, file)
		let uploadableContent = new NoteLinkTransformer(this.app, file).transform(content)
		if (frontmatter) {
			uploadableContent = this.stripFrontmatter(uploadableContent, frontmatter)
		}

		if (frontmatter?.gist_id) {
			await this.githubInterface.rest.gists.update({
				gist_id: frontmatter.gist_id,
				files: { [file.name]: { content: uploadableContent } },
				public: false
			})
		} else {
			const result = await this.githubInterface.rest.gists.create({
				files: { [file.name]: { content: uploadableContent } },
				public: false
			})

			const gistId = result.data.id

			if (frontmatter) {
				let frontmatterEnd = frontmatter.position.end.line
				let lines = content.split('\n')
				lines.splice(frontmatterEnd, 0, `gist_id: \"${gistId}\"`)

				editor.setValue(lines.join('\n'))
			} else {
				editor.setValue(`---\ngist_id: \"${gistId}\"\n---\n\n${content}`)
			}
		}
	}

	stripFrontmatter(content: string, frontmatter: FrontMatter) {
		let frontmatterEnd = frontmatter.position.end.line
		let lines = content.split('\n')
		lines.splice(0, frontmatterEnd + 1)
		return lines.join('\n')
	}

	onunload() {}

	createGithubConnection() {
		if (this.settings.token !== '') {
			this.githubInterface = new Octokit({ auth: this.settings.token })
		} else {
			this.githubInterface = null
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings() {
		await this.saveData(this.settings)
	}
}
