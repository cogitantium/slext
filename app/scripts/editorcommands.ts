import { Slext } from './slext';
import { Service } from 'typedi';
import { File, FileTree } from './file';
import * as $ from 'jquery';
import { PageHook } from './pagehook.service';
declare var _debug_editors: [AceAjax.Editor];


@Service()
export class EditorCommands {
    constructor(private slext: Slext) {
        let self = this;
        $(document).keydown(function (e) {
            let functions = {
                67: () => self.wrapSelectedText(),
                71: () => self.jumpToFile()
            }
            if (e.altKey && functions[e.which]) {
                functions[e.which]();
            }
        });
    }

    public wrapSelectedText() {
        let command = prompt("Wrapping command");
        command = command.replace(/ /g, ''); //remove all spaces
        if (command == null) return;
        let injectedFunction = function (command) {
            var editor = _debug_editors[0];
            var range = editor.getSelectionRange();
            var start = range.start,
                end = range.end;
               
            editor.getSession().insert(end, "}");
            editor.getSession().insert(start, (command ? "\\" : "") + command + "{");
            editor.clearSelection();

            if(start.row == end.row && start.column == end.column) { //no text selected
            	editor.gotoLine(start.row + 1, start.column + 2 + command.length); //2 for \{
            } else {
              if(command.length > 0) {
                	editor.gotoLine(end.row + 1, end.column + 3 + command.length); //3 for \{}
              } else {
                	editor.gotoLine(end.row + 1, end.column + 2); //2 for {}
              }
            }

        }
        PageHook.call(injectedFunction, [command]);
    }

    public characterCount() {
        let injectedFunction = function () {
            var editor = _debug_editors[0];
            var text = editor.getSession().getDocument().getTextRange(editor.getSelectionRange());
            return text.length;
        }
        return PageHook.call(injectedFunction);
    }

    public jumpToFile() {
        let self = this;
        let findCurrentFile = function () {
            var editor = _debug_editors[0];
            var cursor = editor.getCursorPosition();
            return {
                row: cursor.row,
                col: cursor.column,
                text: editor.getSession().getLine(cursor.row)
            };
        }
        PageHook.call(findCurrentFile).then(x => {
            let col: number = x.col;
            let row: number = x.row;
            let text: string = x.text;

            let possibleMatches = text.match(/\{([a-zA-Z0-9_\.\/]+)\}/ig) || [];
            possibleMatches = possibleMatches.map(x => x.replace(/[{()}]/g, ''));
            
            let currentFile = self.slext.currentFile();
            
            let root = self.slext.getFileTree();
            let current = root.parse(currentFile.path).parent;
            let nodesToTest : FileTree[] = [current, root];

            for (let i = 0; i < possibleMatches.length; i++) {
                let match = possibleMatches[i];
                let firstPossibleStartPos = col - match.length;
                let lastPossibleEndPos = col + match.length;
                let sub = text.substring(firstPossibleStartPos, lastPossibleEndPos);
                if (sub.includes(match)) {
                    //This is a possible file to search for

                    for (let n = 0; n < nodesToTest.length; n++) {
                        let node = nodesToTest[n];
                        let res = node.parse(match);
                        if (res != null) {
                            $(res.file.handle).click();
                            return;
                        }
                    }
                }
            }
        });
    }
}
