import * as $ from 'jquery';

export interface File {
    name: string;
    path: string;
    handle: Element;
}

export class FileUtils {
    public static newFile(element: Element): File {
        let name = FileUtils.getName(element);
        let path = FileUtils.getPath(element);
        return {
            name: name,
            path: path + name,
            handle: element
        };
    }

    public static getPath(element: Element): string {
        let path = '';
        let folders = $(element)
            .parentsUntil('div[ng-if="rootFolder"]')
            .filter('div[ng-if="entity.type == \'folder\'"]');
        folders
            .get()
            .reverse()
            .forEach(function(element: Element, index: number) {
                let folderNameEl = $(element)
                    .find('div div span.ng-binding')
                    .first();
                path += folderNameEl.text().trim() + '/';
            });
        return path;
    }

    public static getName(element: Element): string {
        return $(element)
            .find('span.ng-binding')
            .eq(0)
            .text()
            .replace(' ', '');
    }

    public static isFile(el: Element): boolean {
        return $(el)
            .parent()
            .is('div.entity[ng-if="entity.type != \'folder\'"]');
    }
}

export class FileTree {
    constructor(
        public parent : FileTree,
        public name : string,
        public children : FileTree[],
        public isDirectory : boolean,
        public file : File
    ) {}

    public parse(path: string) {
        if (path.startsWith("/")) {
            path = path.slice(1);
        }
        return this._parse(path.split("/"));
    }

    private _parse(parts : string[]) : FileTree {
        if (parts.length == 0 && !this.isDirectory) {
            return this;
        }
        if (parts.length == 1) {
            if (!this.isDirectory) {
                return null;
            }
            let name = parts[0];
            for (let i = 0; i < this.children.length; i++) {
                let cname = this.children[i].name;
                if (cname == name) {
                    return this.children[i];
                } else if (cname.indexOf(".") > 0){
                    let nameWithoutExtension = cname.slice(0, cname.lastIndexOf("."));
                    if (nameWithoutExtension == name) {
                        return this.children[i];
                    }
                }
            }
            return null;
        } 

        if (!this.isDirectory) {
            return null;
        }

        let toParse = parts[0];

        if (toParse == ".") {
            return this._parse(parts.slice(1));
        }
        if (toParse == "..") {
            return this.parent._parse(parts.splice(1));
        }

        for (let i = 0; i < this.children.length; i++) {
            if (this.children[i].name == toParse) {
                return this.children[i]._parse(parts.splice(1));
            }
        }

        return null;
    }

    public static newFileTree(element: Element, parent : FileTree) : FileTree {
        let entity = $(element).find("li.ng-scope .entity-name").first()
        if (FileUtils.isFile(entity[0])) {
            let file = FileUtils.newFile(entity[0]);
            return new FileTree(parent, file.name, [], false, file);
        } else {
            // It's a directory
            let node = new FileTree(parent, FileUtils.getName(entity[0]), [], true, null);
            let childrenElements = $(element).find(".entity>ul").first().children().toArray();
            node.children = childrenElements.map(c => FileTree.newFileTree(c, node));
            return node;
        }
    }
}