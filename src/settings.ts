import { App, PluginSettingTab, Setting } from 'obsidian'
import PublishGistPlugin from 'src'

class GistSyncSettingTab extends PluginSettingTab {
	plugin: PublishGistPlugin

	constructor(app: App, plugin: PublishGistPlugin) {
		super(app, plugin)
		this.plugin = plugin
	}

	display(): void {
		const { containerEl } = this

		containerEl.empty()

		containerEl.createEl('p', {
			text: 'To use this plugin, you need to create a Github API token'
		})
		containerEl.createEl('a', {
			text: 'Create a Github API token.',
			href: 'https://github.com/settings/tokens/new'
		})

		new Setting(containerEl).setName('Github access token').addText((text) =>
			text.setValue(this.plugin.settings.token).onChange(async (value) => {
				this.plugin.settings.token = value
				await this.plugin.saveSettings()
				this.plugin.createGithubConnection()
			})
		)
	}
}

export default GistSyncSettingTab
