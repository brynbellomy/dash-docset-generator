
import * as assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'
import * as when from 'when'
import * as whenNode from 'when/node'
import * as ncp from 'ncp'
import * as sh from 'shelljs'
import cheerio = require('cheerio')
const mdToc = require('markdown-it-toc')


const plist: any = require('plist')

const $fs = whenNode.liftAll(fs)
const $ncp = whenNode.liftAll(ncp)

import brynMd = require('bryn-md-render')
import {Path, File, Directory} from 'fs-objects'

import {DocsetConfig, DocsetItem} from './DocsetConfig'
import {DatabaseBuilder} from './DatabaseBuilder'


export class DocsetBuilder
{
    config: DocsetConfig;

    get buildRoot():          Path { return new Path(this.config.outDir) }
    get docsetRoot():         Path { return this.buildRoot.push(`${this.config.bundle_name}.docset`) }
    get docsetDocumentsDir(): Path { return this.docsetRoot.push('Contents', 'Resources', 'Documents') }
    get plistFilename():      Path { return this.docsetRoot.push('Contents', 'Info.plist') }
    get dbFilename():         Path { return this.docsetRoot.push('Contents', 'Resources', 'docSet.dsidx') }


    databaseBuilder: DatabaseBuilder;
    contents: DocsetItem[];


    constructor (docsetConfig:DocsetConfig) {
        this.config = docsetConfig
        this.contents = this.config.contents || []
        this.databaseBuilder = new DatabaseBuilder(this.dbFilename)
    }

    build (): when.Promise<void> {
        // nuke + regenerate directory structure
        sh.rm('-rf', this.docsetRoot.pathString)
        sh.mkdir('-p', this.docsetDocumentsDir.pathString)

        // let directCopyPaths = this.config.files.filter((file) => path.extname(file).toLowerCase() !== '.md')
        // let markdownPaths   = this.config.files.filter((file) => path.extname(file).toLowerCase() === '.md')

        let promises: when.Promise<any>[] = [
            // $.file.copyAll(directCopyPaths, this.docsetDocumentsDir, {clobber: true}),
            // this.generateMarkdown(markdownPaths),
            this.generatePlist(),
            this.generateDatabase(),
        ]
        for (const file of this.config.files) {
            promises.push(this.handleFile(new Path(file)))
        }

        return when.join(promises).then(() => {
            console.log('Done.')
            return
        })
    }


    handleFile (file:Path): when.Promise<File> {
        var buildFilePromise: when.Promise<File>

        switch (file.extname.toLowerCase()) {
            case '.md':  buildFilePromise = this.generateMarkdown(new File(file)); break
            default:     buildFilePromise = this.copyFileToDocsetDocumentsDir(file); break
        }

        return buildFilePromise.then((outFile) => {
            return this.addHeaderAnchorsToHTMLFile(outFile)
        })
    }


    copyFileToDocsetDocumentsDir (file:Path): when.Promise<File> {
        const {promise, resolve, reject} = when.defer<File>()

        const outFile = this.builtFilenameForSourceFile(file.pathString)
        ncp.ncp(file.pathString, outFile, {clobber: true}, (err: Error) => {
            if (!!err) { return reject(err) }
            return resolve(new File(outFile))
        })

        return promise
    }


    addHeaderAnchorsToHTMLFile (file:File): when.Promise<File> {
        return when.promise<File>((resolve, reject) => {
            if (file.extname === '.html')
            {
                const $ = cheerio.load(file.contents.toString())

                $('h1, h2, h3, h4, h5, h6').each((idx, header) => {
                    const text = $(header).text()
                    const $anchors = $(header).find('a')

                    // dash needs this class, i think?
                    $anchors.addClass('dashAnchor')

                    const entryName = text
                    const entryNameSafe = encodeURIComponent(entryName)
                    const entryType = 'Module'
                    const entryPath = `${file.basename}#${entryNameSafe}`

                    // add the anchor element 'name' attribute with our metadata
                    $anchors.attr('name', `//apple_ref/${entryType}/${entryNameSafe}`)

                    // we have to add the anchor to the SQLite db too
                    this.databaseBuilder.addItem(entryName, entryType, entryPath)
                })

                const transformedHtml = $.html()

                $fs.writeFile(file.path.pathString, transformedHtml)
                    .then(() => { resolve(file) })
            }
            else { resolve(file) }
        })
    }


    generateMarkdown (mdFile:File): when.Promise<File>
    {
        return when.promise<File>((resolve, reject) => {
            console.log('Generating markdown...')

            const outFile = this.builtFilenameForSourceFile(mdFile.path.pathString)

            return this.renderMarkdown(mdFile)
                       .then((mdHtml:string) => this.renderMarkdownLayout(mdHtml))
                       .then((html:string) => $fs.writeFile(outFile, html))
                       .then(() => resolve(new File(outFile)))
        })
    }

    renderMarkdownLayout (mdHtml:string): string {
        return `
            <html>
                <head>
                    <title>${this.config.title}</title>
                    ` + (!!this.config.stylesheet ? `<link rel="stylesheet" type="text/css" href="${this.config.stylesheet}" />` : '')
                      + `
                </head>

                <body>
                    ${mdHtml}
                </body>
            </html>
        `
    }

    renderMarkdown (file:File): when.Promise<string>
    {
        return when.promise<string>((resolve, reject) => {
            var md = brynMd.getRenderer()
            md = (<any>md).use(require('markdown-it-toc'))

            let mdHtml = md.render(file.contents.toString())

            resolve(this.renderMarkdownLayout(mdHtml))
        })
    }


    generatePlist(): when.Promise<void>
    {
        return when.promise<void>((resolve, reject) => {
            console.log('Generating plist...')

            const plistData = {
              'CFBundleIdentifier':      'cheatsheet',
              'CFBundleName':            (this.config.title) ? this.config.title : 'No Title',
              'DocSetPlatformFamily':    'cheatsheet',
              'DashDocSetFamily':        'dashtoc', //'cheatsheet',
              'isDashDocset':            true,
              'dashIndexFilePath':       this.builtFilenameForSourceFile(this.config.index_file),
              'DashDocSetPluginKeyword': (this.config.keyword) ? this.config.keyword : 'cheatsheet',
              'DashDocSetKeyword':       (this.config.keyword) ? this.config.keyword : 'cheatsheet'
            }
            const builtPlist: string = plist.build(plistData)

            resolve($fs.writeFile(this.plistFilename.pathString, builtPlist))
        })
    }


    builtFilenameForSourceFile (srcFile:string): string
    {
        let dir = path.dirname(srcFile)

        // replace inDir with outDir
        var outFile = new Path(srcFile).transposedToNewParentDir(this.docsetDocumentsDir)

        // handle files that change extension
        let ext = path.extname(srcFile)
        switch (ext) {
            case '.md': outFile = outFile.withExtension('.html'); break
            default:    break
        }

        return outFile.pathString
    }


    generateDatabase(): when.Promise<void>
    {
        // return when.promise<void>((resolve, reject) => {
            console.log('Generating database...')

            // add the docset's index file as the first header/category/whatever

            let builtIndexFilename = new Path(this.builtFilenameForSourceFile(this.config.index_file)).basename
            this.databaseBuilder.addItem(this.config.title, 'Category', builtIndexFilename)

            return this.databaseBuilder.generateDatabase()

            // var db = new sqlite3.Database(this.dbFilename.pathString)

            // db.serialize(() => {
            //     this.setupTables(db)

            //     // add the docset's index file as the first header/category/whatever
            //     this.insertDocsetItem(new DocsetItem(this.config.title, 'Category', this.config.index_file), db)

            //     // add each item in `config.contents` as a header/category/whatever
            //     this.config.contents.forEach((item:DocsetItem) => {
            //         this.insertDocsetItem(item, db)
            //     })
            // })
            // db.close()
            // resolve(undefined)
        // })
    }


}
