import Dispatcher from './dispatcher';
import { File, FileUtils, FileTree } from './file';
import * as $ from 'jquery';
import { Container, Inject, Service } from 'typedi';
import * as ace from 'ace-builds/src-noconflict/ace';
import { PageHook } from './pagehook.service';
import { Utils } from './utils';


@Service()
export class Slext extends Dispatcher {
    private _files: Array<File> = [];
    private _filetree: FileTree;
    private static id = 0;
    private loaded = false;

    id = -1;

    constructor() {
        super();
        let self = this;
        this.id = Slext.id++;
        let loading = true;
        let loadingTimer = setInterval(function () {

            // Then check if the SL loading screen has finished
            if (document.getElementsByClassName('loading-screen').length)
                return;

            clearInterval(loadingTimer);
            document.body.classList.add(Utils.isShareLatex(window.location.href) ? "sharelatex" : "overleaf");
            self.loadingFinished();
            self.loaded = true;
        }, 200);
    }

    public isLoaded() {
        return this.loaded;
    }

    public getId() {
        return this.id;
    }

    public isFullScreenPDF(): boolean {
        return $(".full-size.ng-scope:not(.ng-hide)[ng-show=\"ui.view == 'pdf'\"]").length > 0;
    }

    public goToFullScreenPDF() {
        $("[ng-click=\"togglePdfView()\"]").click();
    }

    private loadingFinished() {
        let self = this;
        let mo = new MutationObserver(function (mutations, observer) {
            if (
                mutations[0].addedNodes.length != 0 ||
                mutations[0].removedNodes.length != 0
            ) {
                // Files have been added or removed from file tree
                self.updateFiles();
            }
        });
        mo.observe(document.querySelector(".file-tree"), {childList: true, subtree: true });
        this.updateFiles();
        this.setupListeners();
    }

    private setupListeners() {
        let self = this;
        let fileClickListener = $('html').on(
            'click',
            '.entity-name.ng-isolate-scope',
            function (evt) {
                var el = this;
                let file = FileUtils.newFile(el);
                self.dispatch('FileSelected', file);
            }
        );

        document.addEventListener("slext_editorChanged", function (e) {
            self.dispatch("editorChanged");
        });

        $(document).on('click', '[ng-click="switchToSideBySideLayout()"], [ng-click="switchToFlatLayout()"]', function () {
            self.dispatch("layoutChanged");
        });
    }

    public updateFiles() {
        this._files = this.indexFiles();
        this._filetree = this.buildFileTree();
        this.dispatch('FilesChanged');
    }


    private indexFiles() {
        let self = this;
        let files: Array<File> = [];
        $('file-entity > li.ng-scope .entity-name').each(function (
            index: number,
            element: Element
        ) {
            if (!FileUtils.isFile(element)) return;
            files.push(FileUtils.newFile(element));
        });
        return files;
    }

    public getFiles(): Array<File> {
        return this._files;
    }

    public currentFile() {
        let currentFile = $('file-entity > li.ng-scope.selected .entity-name');
        if (currentFile.length == 0) return null;
        if (FileUtils.isFile(currentFile[0])) {
            return FileUtils.newFile(currentFile[0]);
        }
        return null;
    }

    private buildFileTree() {
        let self = this;
        let rootEntries = $(".file-tree-list>file-entity");
        let root = new FileTree(null, "", [], true, null);
        let rootFiles : FileTree[] = rootEntries.toArray().map(el => FileTree.newFileTree(el, root));
        root.children = rootFiles;

        return root;
    }

    public getFileTree(): FileTree {
        return this._filetree;
    }
}
