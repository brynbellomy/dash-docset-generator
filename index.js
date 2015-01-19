
var yaml = require('js-yaml')
  , qs = require('querystring')
  , plist = require('plist')
  , fs = require('fs-extra')
  , path  = require('path')

module.exports = {
    // classes
    Docset: Docset
  , DocsetItem: DocsetItem

    // functions
  , generate: generate
  , generateFromYAML: generateFromYAML
  , generateFromJSON: generateFromJSON
  , generateDatabase: generateDatabase
  , generatePlist: generatePlist
  , insertDocsetItem: insertDocsetItem
  , setupTables: setupTables
}


function generateFromYAML(configFile, inDir, outDir)
{
    var rawConfig = fs.readFileSync(configFile).toString()
    var docset    = yaml.safeLoad(rawConfig)

    return generate(docset, inDir, outDir)
}

function generateFromJSON(configFile, inDir, outDir)
{
    var rawConfig = fs.readFileSync(configFile).toString()
    var docset    = JSON.parse(rawConfig)

    return generate(docset, inDir, outDir)
}

function generate(docset, inDir, outDir)
{
    // console.log('docset = ', docset)

    var docsetRoot         = path.join(outDir, docset.bundle_name + '.docset')
    var docsetDocumentsDir = path.join(docsetRoot, 'Contents', 'Resources', 'Documents')

    mkdir('-p', docsetDocumentsDir)

    for (var i in docset.files) {
        var copyFile = path.join(inDir, docset.files[i])
        var newPath  = path.join(docsetDocumentsDir, path.basename(copyFile))

        var stats = fs.statSync(copyFile)
        if (stats.isFile()) {
            cp('-f', copyFile, newPath)
        }
        else {
            cp('-Rf', copyFile, newPath)
        }
    }

    var cssIn  = path.join(inDir, 'style.css')
      , cssOut = path.join(docsetDocumentsDir, 'style.css')

    cp('-f', cssIn, cssOut)

    generateDatabase(docsetRoot, docset)
    generatePlist(docsetRoot, docset)

    return {code: 0}
}


function generateDatabase(docsetRoot, docset)
{
    var dbPath = path.join(docsetRoot, 'Contents', 'Resources', 'docSet.dsidx')
    console.log('db path = ', dbPath)
    var sqlite3 = require('sqlite3').verbose()
    var db = new sqlite3.Database(dbPath) //':memory:')

    db.serialize(function () {
        setupTables(db)
        insertDocsetItem(new DocsetItem(docset.title, 'Category', docset.index_file), db)

        docset.contents.forEach(function (item) {
            insertDocsetItem(item, db)
        })
    })
    db.close()
}


function generatePlist(docsetRoot, docset)
{
    var plistData = {
      'CFBundleIdentifier': 'cheatsheet',
      'CFBundleName': (docset.title) ? docset.title : 'No Title',
      'DocSetPlatformFamily': 'cheatsheet',
      'DashDocSetFamily': 'cheatsheet',
      'isDashDocset': true,
      'dashIndexFilePath': docset.index_file,
      'DashDocSetPluginKeyword': (docset.keyword) ? docset.keyword : 'cheatsheet',
      'DashDocSetKeyword': (docset.keyword) ? docset.keyword : 'cheatsheet'
    }
    var builtPlist    = plist.build(plistData)
    var plistFilename = path.join(docsetRoot, 'Contents', 'Info.plist')

    fs.writeFileSync(plistFilename, builtPlist)
}

function Docset(t, k, c) {
    this.title = t
    this.keyword = k
    this.contents = c
}

function DocsetItem(n, t, p) {
    this.name = n
    this.type = t
    this.path = (p != null) ? p : createAnchorPath(this)
}

function insertDocsetItem(item, db) {
    if (!item.path) {
        item.path = makeDocsetPathForItem(item)
    }

    var stmt = db.prepare('INSERT INTO searchIndex(name, type, path) VALUES (?, ?, ?)')
    stmt.run(item.name, item.type, item.path)
    stmt.finalize()
}

function setupTables(db) {
    var query = [
        'CREATE TABLE searchIndex(id INTEGER PRIMARY KEY, name TEXT, type TEXT, path TEXT);'
      , 'CREATE UNIQUE INDEX anchor ON searchIndex (name, type, path);'
    ].join(' ')

    db.run(query)
}



