# Obsidian publish Gist

This plugin allows you to automatically upload a note to a Github Gist.

## Usage

You will need to set up a Github access token in order to use this plugin. This can be done [here](https://github.com/settings/tokens/new)

The only scope that the token needs to have enabled is `gist`:

![The row in the token settings that needs to be enabled](./images/gist-row.png)

After adding the token to Obsidian settings, a new command `Publish file to Github gist` will become available. Upon selection, the currently active note will automatically be uploaded to Github as a new private gist.

The command will also add a property to the frontmatter called `gist_id`. This property is used to identify the gist that the note is published to.

### Adding a file to a preexisting gist

You can also add the `gist_id` property manually. This will cause the `Publish file to Github gist` command to add the active file to the gist with the provided `gist_id`
