var fs = require('fs');
var path = require('path');
var when = require('when');
var whenNode = require('when/node');
var ncp = require('ncp');
var sh = require('shelljs');
var cheerio = require('cheerio');
var mdToc = require('markdown-it-toc');
var plist = require('plist');
var $fs = whenNode.liftAll(fs);
var $ncp = whenNode.liftAll(ncp);
var brynMd = require('bryn-md-render');
var fs_objects_1 = require('fs-objects');
var DatabaseBuilder_1 = require('./DatabaseBuilder');
var DocsetBuilder = (function () {
    function DocsetBuilder(docsetConfig) {
        this.config = docsetConfig;
        this.contents = this.config.contents || [];
        this.databaseBuilder = new DatabaseBuilder_1.DatabaseBuilder(this.dbFilename);
    }
    Object.defineProperty(DocsetBuilder.prototype, "buildRoot", {
        get: function () { return new fs_objects_1.Path(this.config.outDir); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocsetBuilder.prototype, "docsetRoot", {
        get: function () { return this.buildRoot.push(this.config.bundle_name + ".docset"); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocsetBuilder.prototype, "docsetDocumentsDir", {
        get: function () { return this.docsetRoot.push('Contents', 'Resources', 'Documents'); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocsetBuilder.prototype, "plistFilename", {
        get: function () { return this.docsetRoot.push('Contents', 'Info.plist'); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocsetBuilder.prototype, "dbFilename", {
        get: function () { return this.docsetRoot.push('Contents', 'Resources', 'docSet.dsidx'); },
        enumerable: true,
        configurable: true
    });
    DocsetBuilder.prototype.build = function () {
        // nuke + regenerate directory structure
        sh.rm('-rf', this.docsetRoot.pathString);
        sh.mkdir('-p', this.docsetDocumentsDir.pathString);
        // let directCopyPaths = this.config.files.filter((file) => path.extname(file).toLowerCase() !== '.md')
        // let markdownPaths   = this.config.files.filter((file) => path.extname(file).toLowerCase() === '.md')
        var promises = [
            // $.file.copyAll(directCopyPaths, this.docsetDocumentsDir, {clobber: true}),
            // this.generateMarkdown(markdownPaths),
            this.generatePlist(),
            this.generateDatabase(),
        ];
        for (var _i = 0, _a = this.config.files; _i < _a.length; _i++) {
            var file = _a[_i];
            promises.push(this.handleFile(new fs_objects_1.Path(file)));
        }
        return when.join(promises).then(function () {
            console.log('Done.');
            return;
        });
    };
    DocsetBuilder.prototype.handleFile = function (file) {
        var _this = this;
        var buildFilePromise;
        switch (file.extname.toLowerCase()) {
            case '.md':
                buildFilePromise = this.generateMarkdown(new fs_objects_1.File(file));
                break;
            default:
                buildFilePromise = this.copyFileToDocsetDocumentsDir(file);
                break;
        }
        return buildFilePromise.then(function (outFile) {
            return _this.addHeaderAnchorsToHTMLFile(outFile);
        });
    };
    DocsetBuilder.prototype.copyFileToDocsetDocumentsDir = function (file) {
        var _a = when.defer(), promise = _a.promise, resolve = _a.resolve, reject = _a.reject;
        var outFile = this.builtFilenameForSourceFile(file.pathString);
        ncp.ncp(file.pathString, outFile, { clobber: true }, function (err) {
            if (!!err) {
                return reject(err);
            }
            return resolve(new fs_objects_1.File(outFile));
        });
        return promise;
    };
    DocsetBuilder.prototype.addHeaderAnchorsToHTMLFile = function (file) {
        var _this = this;
        return when.promise(function (resolve, reject) {
            if (file.extname === '.html') {
                var $_1 = cheerio.load(file.contents.toString());
                $_1('h1, h2, h3, h4, h5, h6').each(function (idx, header) {
                    var text = $_1(header).text();
                    var $anchors = $_1(header).find('a');
                    // dash needs this class, i think?
                    $anchors.addClass('dashAnchor');
                    var entryName = text;
                    var entryNameSafe = encodeURIComponent(entryName);
                    var entryType = 'Module';
                    var entryPath = file.basename + "#" + entryNameSafe;
                    // add the anchor element 'name' attribute with our metadata
                    $anchors.attr('name', "//apple_ref/" + entryType + "/" + entryNameSafe);
                    // we have to add the anchor to the SQLite db too
                    _this.databaseBuilder.addItem(entryName, entryType, entryPath);
                });
                var transformedHtml = $_1.html();
                $fs.writeFile(file.path.pathString, transformedHtml)
                    .then(function () { resolve(file); });
            }
            else {
                resolve(file);
            }
        });
    };
    DocsetBuilder.prototype.generateMarkdown = function (mdFile) {
        var _this = this;
        return when.promise(function (resolve, reject) {
            console.log('Generating markdown...');
            var outFile = _this.builtFilenameForSourceFile(mdFile.path.pathString);
            return _this.renderMarkdown(mdFile)
                .then(function (mdHtml) { return _this.renderMarkdownLayout(mdHtml); })
                .then(function (html) { return $fs.writeFile(outFile, html); })
                .then(function () { return resolve(new fs_objects_1.File(outFile)); });
        });
    };
    DocsetBuilder.prototype.renderMarkdownLayout = function (mdHtml) {
        return ("\n            <html>\n                <head>\n                    <title>" + this.config.title + "</title>\n                    ") + (!!this.config.stylesheet ? "<link rel=\"stylesheet\" type=\"text/css\" href=\"" + this.config.stylesheet + "\" />" : '')
            + ("\n                </head>\n\n                <body>\n                    " + mdHtml + "\n                </body>\n            </html>\n        ");
    };
    DocsetBuilder.prototype.renderMarkdown = function (file) {
        var _this = this;
        return when.promise(function (resolve, reject) {
            var md = brynMd.getRenderer();
            md = md.use(require('markdown-it-toc'));
            var mdHtml = md.render(file.contents.toString());
            resolve(_this.renderMarkdownLayout(mdHtml));
        });
    };
    DocsetBuilder.prototype.generatePlist = function () {
        var _this = this;
        return when.promise(function (resolve, reject) {
            console.log('Generating plist...');
            var plistData = {
                'CFBundleIdentifier': 'cheatsheet',
                'CFBundleName': (_this.config.title) ? _this.config.title : 'No Title',
                'DocSetPlatformFamily': 'cheatsheet',
                'DashDocSetFamily': 'dashtoc',
                'isDashDocset': true,
                'dashIndexFilePath': _this.builtFilenameForSourceFile(_this.config.index_file),
                'DashDocSetPluginKeyword': (_this.config.keyword) ? _this.config.keyword : 'cheatsheet',
                'DashDocSetKeyword': (_this.config.keyword) ? _this.config.keyword : 'cheatsheet'
            };
            var builtPlist = plist.build(plistData);
            resolve($fs.writeFile(_this.plistFilename.pathString, builtPlist));
        });
    };
    DocsetBuilder.prototype.builtFilenameForSourceFile = function (srcFile) {
        var dir = path.dirname(srcFile);
        // replace inDir with outDir
        var outFile = new fs_objects_1.Path(srcFile).transposedToNewParentDir(this.docsetDocumentsDir);
        // handle files that change extension
        var ext = path.extname(srcFile);
        switch (ext) {
            case '.md':
                outFile = outFile.withExtension('.html');
                break;
            default: break;
        }
        return outFile.pathString;
    };
    DocsetBuilder.prototype.generateDatabase = function () {
        // return when.promise<void>((resolve, reject) => {
        console.log('Generating database...');
        // add the docset's index file as the first header/category/whatever
        var builtIndexFilename = new fs_objects_1.Path(this.builtFilenameForSourceFile(this.config.index_file)).basename;
        this.databaseBuilder.addItem(this.config.title, 'Category', builtIndexFilename);
        return this.databaseBuilder.generateDatabase();
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
    };
    return DocsetBuilder;
})();
exports.DocsetBuilder = DocsetBuilder;
