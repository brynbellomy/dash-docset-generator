
import * as path from 'path'
import when = require('when')
import sqlite3 = require('sqlite3')
sqlite3.verbose()

import {File, Path, Directory} from 'fs-objects'

import {DocsetItem} from './DocsetConfig'


export class DatabaseBuilder
{
    db: sqlite3.Database;
    dbPath: Path;

    private items: DocsetItem[] = [];

    constructor (dbPath:Path) {
        this.dbPath = new Path(dbPath.pathString)
    }

    addItem (name:string, type:string, path:string): void {
        let item = new DocsetItem(name, type, path)
        this.items.push(item)
    }

    generateDatabase(): when.Promise<void>
    {
        let thePath = path.resolve(path.join('.', this.dbPath.pathString))
        this.db = new sqlite3.Database(thePath)
        
        return when.promise<void>((resolve, reject) => {
            try {
                this.db.serialize(() => {
                    this.setupTables()

                    // add each item in `config.items` as a header/category/whatever
                    this.items.forEach((item:DocsetItem) => {
                        this.insertDocsetItem(item)
                    })
                })
                this.db.close()
                resolve(undefined)
            } catch (err) { console.error('ZERROR ~>', err, err.stack) }
        })
    }


    insertDocsetItem (item:DocsetItem): void {
        var stmt = this.db.prepare('INSERT INTO searchIndex(name, type, path) VALUES (?, ?, ?)')
        stmt.run(item.name, item.type, item.path)
        stmt.finalize()
    }


    setupTables (): void {
        let query = [
            'CREATE TABLE searchIndex(id INTEGER PRIMARY KEY, name TEXT, type TEXT, path TEXT);'
          , 'CREATE UNIQUE INDEX anchor ON searchIndex (name, type, path);'
        ].join(' ')

        this.db.run(query)
    }
}