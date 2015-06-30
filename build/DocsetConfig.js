var fs = require('fs');
var path = require('path');
var when = require('when');
var yaml = require('js-yaml');
var yamlFrontMatter = require('yaml-front-matter');
var DocsetItem = (function () {
    function DocsetItem(name, type, path) {
        this.name = name;
        this.type = type;
        this.path = path;
    }
    return DocsetItem;
})();
exports.DocsetItem = DocsetItem;
var DocsetConfig = (function () {
    function DocsetConfig(configFilepath, inDir, outDir, values) {
        this.files = [];
        this.contents = [];
        function demand(val, error) {
            if (val === null || val === undefined) {
                throw new Error(error);
            }
            return val;
        }
        this.inDir = demand(inDir, 'No input directory given to DocsetConfig constructor.');
        this.outDir = demand(outDir, 'No output directory given to DocsetConfig constructor.');
        this.configFilepath = demand(configFilepath, 'No config filepath given to DocsetConfig constructor.');
        this.title = demand(values.title, 'Docset config is missing key "title"');
        var configDir = path.dirname(this.configFilepath);
        this.files = (values.files || []).map(function (file) { return path.resolve(path.join(configDir, file)); });
        this.stylesheet = values.stylesheet || null;
        this.keyword = demand(values.keyword, 'Docset config is missing key "keyword"');
        this.index_file = demand(values.index_file, 'Docset config is missing key "index_file"');
        this.bundle_name = demand(values.bundle_name, 'Docset config is missing key "bundle_name"');
        this.contents = (values.contents || []).map(function (jsonObj) {
            return new DocsetItem(jsonObj.name, jsonObj.type, jsonObj.path);
        });
    }
    DocsetConfig.fromMarkdown = function (mdFilepath, outDir) {
        return when.promise(function (resolve, reject) {
            var rawConfig = fs.readFileSync(mdFilepath, 'utf8');
            var yamlObj = yamlFrontMatter.loadFront(rawConfig);
            yamlObj.index_file = path.basename(mdFilepath);
            var inDir = path.dirname(mdFilepath);
            resolve(new DocsetConfig(mdFilepath, inDir, outDir, yamlObj));
        });
    };
    DocsetConfig.fromYAML = function (configFile, inDir, outDir) {
        return when.promise(function (resolve, reject) {
            var rawConfig = fs.readFileSync(configFile, 'utf8');
            var docsetConfig = yaml.safeLoad(rawConfig);
            resolve(new DocsetConfig(configFile, inDir, outDir, docsetConfig));
        });
    };
    DocsetConfig.fromJSON = function (configFile, inDir, outDir) {
        return when.attempt(function () { return JSON.parse(fs.readFileSync(configFile, 'utf8')); })
            .then(function (jsonObj) { return new DocsetConfig(configFile, inDir, outDir, jsonObj); });
    };
    return DocsetConfig;
})();
exports.DocsetConfig = DocsetConfig;
