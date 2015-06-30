import * as fs from 'fs'
import * as path from 'path'
import * as when from 'when'
import * as yaml from 'js-yaml'
const yamlFrontMatter: any = require('yaml-front-matter')



export class DocsetItem {
    constructor(public name:string,
                public type:string,
                public path:string) {}
}

export interface IDocsetConfig {
    title: string;
    files: string[];
    keyword: string;
    contents: DocsetItem[];
    index_file: string;
    bundle_name: string;
    stylesheet: string;
}

export class DocsetConfig implements IDocsetConfig
{
    // other properties
    inDir: string;
    outDir: string;
    configFilepath: string;

    // properties loaded from yaml/json
    title: string;
    files: string[] = [];
    keyword: string;
    contents: DocsetItem[] = [];
    index_file: string;
    bundle_name: string;
    stylesheet: string;

    constructor(configFilepath:string, inDir:string, outDir:string, values:IDocsetConfig) {
        function demand <T>(val:any, error:string): T {
            if (val === null || val === undefined) {
                throw new Error(error)
            }
            return <T>val
        }

        this.inDir = demand<string>(inDir, 'No input directory given to DocsetConfig constructor.')
        this.outDir = demand<string>(outDir, 'No output directory given to DocsetConfig constructor.')
        this.configFilepath = demand<string>(configFilepath, 'No config filepath given to DocsetConfig constructor.')

        this.title = demand<string>(values.title, 'Docset config is missing key "title"')

        let configDir = path.dirname(this.configFilepath)
        this.files = (values.files || []).map((file) => path.resolve(path.join(configDir, file)))

        this.stylesheet = values.stylesheet || null

        this.keyword = demand<string>(values.keyword, 'Docset config is missing key "keyword"')
        this.index_file = demand<string>(values.index_file, 'Docset config is missing key "index_file"')
        this.bundle_name = demand<string>(values.bundle_name, 'Docset config is missing key "bundle_name"')

        this.contents = (values.contents || []).map((jsonObj) => {
            return new DocsetItem(jsonObj.name, jsonObj.type, jsonObj.path)
        })
    }

    static fromMarkdown (mdFilepath:string, outDir:string): when.Promise<DocsetConfig> {
        return when.promise<DocsetConfig>((resolve, reject) => {
            const rawConfig = fs.readFileSync(mdFilepath, 'utf8')
            const yamlObj = yamlFrontMatter.loadFront(rawConfig)
            yamlObj.index_file = path.basename(mdFilepath)
            const inDir = path.dirname(mdFilepath)

            resolve(new DocsetConfig(mdFilepath, inDir, outDir, yamlObj))
        })
    }

    static fromYAML (configFile:string, inDir:string, outDir:string): when.Promise<DocsetConfig> {
        return when.promise<DocsetConfig>((resolve, reject) => {
            const rawConfig = fs.readFileSync(configFile, 'utf8')
            const docsetConfig = yaml.safeLoad(rawConfig)

            resolve(new DocsetConfig(configFile, inDir, outDir, docsetConfig))
        })
    }


    static fromJSON (configFile:string, inDir:string, outDir:string): when.Promise<DocsetConfig> {
        return when.attempt(() => JSON.parse(fs.readFileSync(configFile, 'utf8')))
                   .then((jsonObj) => new DocsetConfig(configFile, inDir, outDir, jsonObj))
    }
}





