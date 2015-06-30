var path = require('path');
var when = require('when');
var sqlite3 = require('sqlite3');
sqlite3.verbose();
var fs_objects_1 = require('fs-objects');
var DocsetConfig_1 = require('./DocsetConfig');
var DatabaseBuilder = (function () {
    function DatabaseBuilder(dbPath) {
        this.items = [];
        this.dbPath = new fs_objects_1.Path(dbPath.pathString);
    }
    DatabaseBuilder.prototype.addItem = function (name, type, path) {
        var item = new DocsetConfig_1.DocsetItem(name, type, path);
        this.items.push(item);
    };
    DatabaseBuilder.prototype.generateDatabase = function () {
        var _this = this;
        var thePath = path.resolve(path.join('.', this.dbPath.pathString));
        this.db = new sqlite3.Database(thePath);
        return when.promise(function (resolve, reject) {
            try {
                _this.db.serialize(function () {
                    _this.setupTables();
                    // add each item in `config.items` as a header/category/whatever
                    _this.items.forEach(function (item) {
                        _this.insertDocsetItem(item);
                    });
                });
                _this.db.close();
                resolve(undefined);
            }
            catch (err) {
                console.error('ZERROR ~>', err, err.stack);
            }
        });
    };
    DatabaseBuilder.prototype.insertDocsetItem = function (item) {
        var stmt = this.db.prepare('INSERT INTO searchIndex(name, type, path) VALUES (?, ?, ?)');
        stmt.run(item.name, item.type, item.path);
        stmt.finalize();
    };
    DatabaseBuilder.prototype.setupTables = function () {
        var query = [
            'CREATE TABLE searchIndex(id INTEGER PRIMARY KEY, name TEXT, type TEXT, path TEXT);',
            'CREATE UNIQUE INDEX anchor ON searchIndex (name, type, path);'
        ].join(' ');
        this.db.run(query);
    };
    return DatabaseBuilder;
})();
exports.DatabaseBuilder = DatabaseBuilder;
