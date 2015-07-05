
# Dash docset generator

## install

```sh
$ npm install -g dash-docset-generator
```

## building custom docsets

The build command is `build-dash-docsets`, and it takes the following options:

```sh
$ build-dash-docsets

Usage: build-dash-docsets -i <input dir> [-o <output dir>]

Options:
  -i, --inputDir   The directory containing the source files to be converted
                   into a docset.                                     [required]
  -o, --outputDir  The directory in which to place the generated docset.
                                                    [string]  [default: "build"]
  -c, --config     The config file, if an "index.md" with YAML front matter
                   does not exist.                                      [string]
```


## Writing custom docsets

See the [example-docsets](https://github.com/brynbellomy/dash-docset-generator/tree/master/example-docsets) directory if you (like me) are not into reading about code.

### Required config (all formats)

Regardless of the format of your custom docset, it needs to set a few configuration parameters to build correctly.  Here's a sample config in YAML (JSON works too).

```yaml
title: package.json (node.js)
bundle_name: NodePackageJSON
keyword: package.json
files: ["index.md", "../style-solarized-light.css"]
stylesheet: style-solarized-light.css
```

- `title`: the title of the docset
- `bundle_name`: The name of the generated `.docset` folder/bundle.
- `keyword`: The shortcut keyword that will cause Dash to jump to this docset.
- `files`: An array of filenames to be built and/or included in the docset.


### Markdown

Markdown docsets are the simplest, as they can include the required YAML config as part of the `.md` file's front matter.

Here's an example:

```yaml
---
title: package.json (node.js)
bundle_name: NodePackageJSON
keyword: package.json
files: ["index.md", "../style-solarized-light.css"]
stylesheet: style-solarized-light.css
---

package.json(5) -- Specifics of npm's package.json handling
===========================================================

@[toc](Contents)

## name

The *most* important things in your package.json are the name and version fields.
```

... etc.



## authors/contributors

- <bryn.bellomy@gmail.com>


