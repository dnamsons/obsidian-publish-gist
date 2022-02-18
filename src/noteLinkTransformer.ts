import { App, TFile } from 'obsidian'
import { getFrontMatter, gistFileIdFromFilename, gistUrl } from './utils'

interface Transformation {
	linkString: string
	replaceWith: string
}

/**
 * Finds linked notes that are also uploaded to gists and replaces obsidian links (`[[]]`) with markdown links(`[]()`).
 *
 * ## Example
 *
 * ### Note 1
 *
 * ```md
 * Lorem ipsum reference to [[Note 2]]
 * ```
 *
 * ---
 *
 * ### Note 2
 *
 * ```md
 * ---
 * gist_id: "12345"
 * ---
 *
 * Some content
 * ```
 *
 * ---
 *
 * When uploading Note 1 to a gist, `[[Note 2]]` will be replaced with `[Note 2](https://gist.github.com/12345#file-note-2-md)`
 *
 * @public
 */
export default class NoteLinkTransformer {
	app: App
	file: TFile
	activeFileGistId?: string

	constructor(app: App, file: TFile) {
		this.app = app
		this.file = file
		this.activeFileGistId = getFrontMatter(this.app, this.file)?.gist_id
	}

	transform(content: string) {
		const transformations = this.getTransformations()

		transformations.forEach((transformation) => {
			content = content.replace(transformation.linkString, transformation.replaceWith)
		})

		return content
	}

	private getTransformations(): Transformation[] {
		const fileLinks = this.app.metadataCache.resolvedLinks[this.file.path]

		return Object.entries(fileLinks)
			.map(([path, _occurenceCount]) => {
				const linkedFile = this.app.vault.getAbstractFileByPath(path)

				return this.buildTransform(linkedFile as TFile)
			})
			.filter((x) => !!x)
	}

	private buildTransform(linkedFile: TFile): Transformation | undefined {
		const gistId = getFrontMatter(this.app, linkedFile)?.gist_id
		if (gistId) {
			const linkText = this.app.metadataCache.fileToLinktext(linkedFile, linkedFile.path)

			let linkToGist = `#${gistFileIdFromFilename(linkedFile.name)}`
			// The note is in a different gist
			if (gistId !== this.activeFileGistId) {
				linkToGist = `${gistUrl(gistId)}${linkToGist}`
			}

			return {
				linkString: `[[${linkText}]]`,
				replaceWith: `[${linkText}](${linkToGist})`
			} as Transformation
		}
	}
}
