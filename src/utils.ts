import { App, TFile, FrontMatterCache } from 'obsidian'

interface FrontMatter extends FrontMatterCache {
	gist_id?: string
}

export const getFrontMatter = (app: App, file: TFile): FrontMatter | null =>
	app.metadataCache.getFileCache(file)?.frontmatter

/**
 * Get the HTML identifier that gist will generate for the given filename
 * @example
 * ```
 * gistFileIdFromFilename('My file name.md'); // => 'file-my-file-name-md'
 * ```
 */
export const gistFileIdFromFilename = (filename: string) =>
	`file-${filename.toLowerCase().replace('.', ' ').split(' ').join('-')}`
