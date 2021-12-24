import React from 'react';
import FormatPanel from '../FormatPanel.js'
import {loadedSheet, defaultSheet} from './getSheet.js'
import applyResizers from './handlers/resizingHandler.js'
import applyTextChangeHandler from './handlers/textChangeHandler.js';
import applySelectedHandler from './handlers/selectedHandler.js';
import {updateSheetDimensions, applyChange} from './applyChange.js'

const NOCOMMAND = 0;
const CONTROL = 1;
const SHIFT = 2;

class SpreadSheetPanel extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            tableHeight: 0,
            tableWidth: 0,
            table: this.props.loadedSheet.length !== 0 ?
                loadedSheet(this.props.loadedSheet) :
                defaultSheet(parseInt(this.props.rows), parseInt(this.props.defaultRowHeight), parseInt(this.props.cols), parseInt(this.props.defaultColWidth)),
            selectedEntries: [],
            keyEventState: NOCOMMAND,
            changeHistory: [new Map()],
            changeHistoryIndex: 0,
        }
        this.setSheetDimensions = this.setSheetDimensions.bind(this);
        this.getSheetDimensions = this.getSheetDimensions.bind(this);
        this.getSelected = this.getSelected.bind(this);
        this.setSelected = this.setSelected.bind(this);
        this.recordChange = this.recordChange.bind(this);
        this.keyPressed = this.keyPressed.bind(this);
        this.keyUpped = this.keyUpped.bind(this);
        this.undo = this.undo.bind(this);
        this.redo = this.redo.bind(this);
    }
    render() {
        return (
            <div className="content" id="contentID" style={{ height: this.props.outerHeight + 'px', width: this.props.outerWidth + 'px' }}>
                <FormatPanel />
                <div id='spreadsheet' tabIndex='-1' onKeyDown={this.keyPressed} onKeyUp={this.keyUpped} style={{ height: `${this.state.tableHeight}px`, width: `${this.state.tableWidth}px`, border: '1px solid black' }}>
                    {this.state.table}
                </div>
            </div>
        );
    }
    componentDidMount() {
        let borderWidth = 2;
        let height = [...document.getElementsByClassName('col0')].reduce(
            (sum, entry) => sum + parseInt(entry.style.height), 0) + 2 * borderWidth;
        let width = parseInt(document.getElementById('row0').style.width) + 2 * borderWidth;
        applyResizers(height, width, this.getSheetDimensions, this.setSheetDimensions, this.recordChange); // resizers.js
        applyTextChangeHandler(this.state.recordChange);
        applySelectedHandler(this.state.keyEventState, this.state.getSelected, this.state.setSelected);
    }

    // Class functions
    setSheetDimensions(height, width) {
        if(height===null) height = this.state.tableHeight;
        if(width===null) width = this.state.tableWidth;
        this.setState({
            tableHeight: height,
            tableWidth: width
        });
    }
    getSheetDimensions() {
        return [this.state.tableHeight, this.state.tableWidth];
    }
    getSelected() {
        return this.state.selectedEntries;
    }
    setSelected(selected) {
        this.setState({selectedEntries: selected});
    }

    // entries = [ [#row, #col, prevVal, newVal],  ... ]
    // prev/newVal = [ text content, [['style property', 'value'], ...] ]
    // Weaves changes from entries[] into this.state.changeHistory
    recordChange(entries) {
        let prevState = new Map();
        let newState = new Map();
        entries.forEach((entry) => {
            let prevEntryStyle = new Map();
            let newEntryStyle = new Map();
            if (this.state.changeHistory[this.state.changeHistoryIndex].has(`${entry[0]}${entry[1]}`)) {
                let thing = this.state.changeHistory[this.state.changeHistoryIndex].get(`${entry[0]}${entry[1]}`);
                for (const [key, value] of thing[1].entries()) {
                    prevEntryStyle.set(key, value);
                }
            }
            entry[2][1].forEach(stylePair => prevEntryStyle.set(stylePair[0], stylePair[1]));
            entry[3][1].forEach(stylePair => newEntryStyle.set(stylePair[0], stylePair[1]));
            prevState.set(`${entry[0]}${entry[1]}`, [entry[2][0], prevEntryStyle]);
            newState.set(`${entry[0]}${entry[1]}`, [entry[3][0], newEntryStyle]);
        });
        for (const [key, val] of this.state.changeHistory[this.state.changeHistoryIndex].entries()) {
            if (!prevState.has(key)) prevState.set(key, val);
        }
        this.setState({
            changeHistory: [...this.state.changeHistory.slice(0, this.state.changeHistoryIndex), prevState, newState],
            changeHistoryIndex: this.state.changeHistoryIndex + 1,
        });
    }

    // Handle CTRL+Z/Y (undo/redo) and CTRL/SHIFT selections.
    keyPressed(e) {
        switch (this.state.keyEventState) {
            case NOCOMMAND:
                if (e.key == 'Control') {
                    console.log('Control');
                    this.setState({ keyEventState: CONTROL });
                } else if (e.key == 'Shift') {
                    console.log('Shift');
                    this.setState({ keyEventState: SHIFT });
                }
                break;
            case CONTROL:
                if (e.key == 'z') {
                    this.undo();
                } else if (e.key == 'y') {
                    this.redo();
                }
                break;
            case SHIFT:
                break;
        }
    }
    keyUpped(e) {
        switch (this.state.keyEventState) {
            case NOCOMMAND:
                console.log('NO COMMAND UP');
                break;
            case CONTROL:
            case SHIFT:
                if (e.key == 'Control' || e.key == 'Shift') {
                    console.log('CTRL/SHIFT UP');
                    this.setState({ keyEventState: NOCOMMAND });
                }
                break;
        }
    }
    undo() {
        console.log('Undo');
        if (this.state.changeHistoryIndex > 0) {
            for (const [key, value] of this.state.changeHistory[this.state.changeHistoryIndex - 1].entries()) {
                if (/^\.row.null$/.test(key)) {
                    let entry = document.getElementById(key.match(/row./));
                    applyChange(entry, value);
                } else if (/^nullnull$/.test(key)) {
                    updateSheetDimensions(value[1], this.setSheetDimensions);
                } else {
                    let entry = document.querySelector(key.match(/^\.row.\.col.$/));
                    applyChange(entry, value);
                }
            }
            this.setState({ changeHistoryIndex: this.state.changeHistoryIndex - 1 });
        }
    }
    redo() {
        console.log('Redo');
        if (this.state.changeHistoryIndex < this.state.changeHistory.length - 1) {
            for (const [key, value] of this.state.changeHistory[this.state.changeHistoryIndex + 1].entries()) {
                if (/^\.row.null$/.test(key)) {
                    let entry = document.getElementById(key.match(/row./));
                    applyChange(entry, value);
                } else if (/^nullnull$/.test(key)) {
                    updateSheetDimensions(value[1], this.setSheetDimensions);
                } else {
                    let entry = document.querySelector(key.match(/^\.row.\.col.$/));
                    applyChange(entry, value);
                }
            }
            this.setState({ changeHistoryIndex: this.state.changeHistoryIndex + 1 });
        }
    }
}
export default SpreadSheetPanel;