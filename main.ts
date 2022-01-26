import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian'
import { Octokit } from '@octokit/rest'

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

		if (this.settings.token !== '') {
			this.githubInterface = new Octokit({ auth: this.settings.token })
		}

		this.addCommand({
			id: 'publish-gist',
			name: 'Publish file to Github gist',
			editorCallback: async (editor) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView)
				if (!!this.githubInterface) {
					const file = markdownView.file

					let content = await this.app.vault.read(file)

					const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter

					let result

					if (frontmatter && frontmatter.gist_id) {
						result = await this.githubInterface.rest.gists.update({
							gist_id: frontmatter.gist_id,
							files: { [file.name]: { content } },
							public: false
						})
					} else {
						result = await this.githubInterface.rest.gists.create({
							files: { [file.name]: { content } },
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

					new Notice('Created successfully!')
				} else {
					new Notice('No Github token')
				}
			}
		})

		this.addSettingTab(new GistSyncSettingTab(this.app, this))
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings() {
		await this.saveData(this.settings)
	}
}

class GistSyncSettingTab extends PluginSettingTab {
	plugin: PublishGistPlugin

	constructor(app: App, plugin: PublishGistPlugin) {
		super(app, plugin)
		this.plugin = plugin
	}

	display(): void {
		const { containerEl } = this

		containerEl.empty()

		const span = containerEl.createSpan()
		containerEl.createEl('p', {
			text: 'To use this plugin, you need to create a Github API token',
			parent: span
		})
		containerEl.createEl('a', {
			text: 'Create a Github API token.',
			href: 'https://github.com/settings/tokens/new',
			parent: span
		})

		new Setting(containerEl).setName('Github access token').addText((text) =>
			text.setValue(this.plugin.settings.token).onChange(async (value) => {
				this.plugin.settings.token = value
				await this.plugin.saveSettings()
			})
		)
	}
}
