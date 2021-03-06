import React from 'react';

import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';

import { v4 as uuidv4 } from 'uuid';

import {bless_modal} from '/common_lib';
import {AlertBox} from '/components/generic/alert/alert.jsx';

const _ = require("lodash");

/*********************************************************************************
 * Purpose: A standard dialogbox
 *
 *
 *
 */

export class StandardDialogbox extends React.Component {
    theAlertBoxRef  = React.createRef();

    modal_id = uuidv4();

    state = {
        show: false,
        payload: null,
    };

    onClose = () => {                                   // derived class rarely override
        this.setState({show: false});
    };
    onSave          = () => { return Promise.reject("Not implemented") };
                                                        // derived MUST override
    canSave         = () => true;                       // derived class to override
    hasSave         = () => false;                      // derived class to override, put a save button?
    onOpen          = (openArgs) => null;               // derived class MUST override
    getTitle        = () => "Standard Dialogbox";       // derived class to override
    renderBody      = () => null;                       // derived class to override
    dialogClassName = "";                               // derived class can override, the CSS classname of the dialogbox


    alert = message => {
        this.theAlertBoxRef.current.show(message);
    };

    onSaveWrapper   = () => {
        // onSave can return a promise or not
        Promise.resolve(this.onSave()).then(
            this.onClose
        ).catch(
            error => {
                this.alert(error);
            }
        );
    };

    openDialog = openArgs => {
        const payload = this.onOpen(openArgs);
        this.setState({
            show: true,
            payload: _.cloneDeep(payload)
        }, () => bless_modal(this.modal_id))
    };

    render() {
        let dialogClassName = "standard-modal";
        if (this.dialogClassName) {
            dialogClassName += (' ' + this.dialogClassName);
        }

        return (
            <Modal
                show={this.state.show}
                onHide={this.onClose}
                backdrop="static"
                scrollable
                animation={false}
                dialogClassName={dialogClassName}
                data-modal-id={this.modal_id}
            >
                <Modal.Header closeButton>
                    <Modal.Title>{this.state.payload!==null  && this.getTitle()}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Container fluid className="pb-2 mb-2">
                        <AlertBox ref={this.theAlertBoxRef}/>
                        { this.state.payload !== null && this.renderBody() }
                    </Container>
                </Modal.Body>

                <Modal.Footer>

                    {this.state.payload !== null && this.hasSave() && <Button
                        variant="primary"
                        size="sm"
                        onClick={this.onSaveWrapper}
                        disabled={!this.canSave()}
                    >
                        Save changes
                    </Button>}
                    <Button variant="secondary" size="sm" onClick={this.onClose}>Close</Button>
                </Modal.Footer>
            </Modal>
        );
    }
}

/*********************************************************************************
 * Purpose: Edit a large chunk of text
 * Properties
 *     dialogClassName: the css classname for the dialog box
 *     title          : the title of the dialogbox
 */

export class TextEditor extends React.Component {
    modal_id = uuidv4();

    state = {
        title: '',
        show: false,
        text: "",
        viewOnly: true,
        onSave: null,
    }

    onClose = () => {
        this.setState({show: false, onSave: null});
    };

    onSaveWrapper   = () => {
        if (this.state.onSave === null) {
            this.setState({show: false, onSave: null});
            return;
        }

        this.setState({show: false}, () => this.state.onSave(this.state.text));
        return;
    };

    openDialog = openArgs => {
        const {title, viewOnly, text, onSave} = openArgs;
        this.setState({
            title: title,
            viewOnly: viewOnly,
            text: text,
            show: true,
            onSave: onSave,
        }, () => bless_modal(this.modal_id))
    };

    render() {
        let dialogClassName = "text-editor-modal";
        if (this.props.dialogClassName) {
            dialogClassName += (' ' + this.props.dialogClassName);
        }

        return (
            <Modal
                show={this.state.show}
                onHide={this.onClose}
                backdrop="static"
                scrollable
                animation={false}
                dialogClassName={dialogClassName}
                data-modal-id={this.modal_id}
            >
                <Modal.Header closeButton>
                    <Modal.Title>{this.state.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Container fluid className="pb-2 mb-2">
                        <Form.Control as="textarea"
                            disabled = {this.state.viewOnly}
                            value={this.state.text}
                                onChange={(event) => {
                                    const v = event.target.value;
                                    this.setState({
                                        text: v
                                    })
                                }}
                            />
                    </Container>
                </Modal.Body>

                <Modal.Footer>
                    {!this.state.viewOnly && <Button
                        variant="primary"
                        size="sm"
                        onClick={this.onSaveWrapper}
                    >
                        Update
                    </Button>}
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={this.onClose}
                    >
                        {this.state.viewOnly?"Close":"Cancel"}
                    </Button>
                </Modal.Footer>
            </Modal>
        );
    }
}
