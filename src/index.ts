import { Editor, MarkdownView, Notice, Plugin, TFile } from 'obsidian'
import { Octokit } from '@octokit/rest'
import GistSyncSettingTab from './settings'
import { FrontMatter, getFrontMatter, gistFileIdFromFilename, gistUrl } from './utils'
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

		this.app.workspace.on('editor-menu', (menu, editor, markdownView) => {
			console.log('gist_id', getFrontMatter(this.app, markdownView.file))

			if (getFrontMatter(this.app, markdownView.file)?.gist_id) {
				menu.addItem((item) =>
					item
						.setTitle('Open Gist')
						.setIcon('github-glyph')
						.onClick(() => console.log('Open'))
				)
			} else {
				menu.addItem((item) =>
					item
						.setTitle('Publish to a Gist')
						.setIcon('github-glyph')
						.onClick(async () => await this.makeRequest(editor))
				)
			}
		})
		this.app.workspace.on('file-menu', (menu, file) => {
			const gistId = getFrontMatter(this.app, file as TFile)?.gist_id
			if (gistId) {
				menu.addItem((item) =>
					item
						.setTitle('Open Gist')
						.setIcon('github-glyph')
						.onClick(() => window.open(`${gistUrl(gistId)}#${gistFileIdFromFilename(file.name)}`))
				)
			}
		})

		this.addSettingTab(new GistSyncSettingTab(this.app, this))
	}

	async makeRequest(editor: Editor) {
		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView)
		const file = markdownView.file

		let content = await this.app.vault.read(file)

		const frontmatter = getFrontMatter(this.app, file)
		const uploadableContent = new NoteLinkTransformer(this.app, file).transform(content)

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
