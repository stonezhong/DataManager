import React from 'react';

import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Modal from 'react-bootstrap/Modal';
import { v4 as uuidv4 } from 'uuid';

import {bless_modal} from '/common_lib';
const _ = require("lodash");

/*********************************************************************************
 * Purpose: General purpose dialogbox
 *
 * Props
 *     all Model props are allowed
 *
 */
export class SimpleDialogBox extends React.Component {
    state = {
        show: false,
        title: '',
        content: <div></div>,
    };

    modal_id = uuidv4();

    onClose = () => {
        this.setState({show: false});
    };

    openDialog = (title, content) => {
        this.setState({
            show: true,
            title: title,
            content: content,
        }, () => bless_modal(this.modal_id))
    };

    render() {
        const dlg_props = {};
        // _.forEach(['size', 'dialogClassName'], key => {
        //     if (key in this.props) {
        //         dlg_props[key] = this.props[key];
        //     }
        // });


        let dialogClassName = "standard-modal"
        if ('dialogClassName' in this.props) {
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
                { ... dlg_props}
            >
                <Modal.Header closeButton>
                    <Modal.Title>{this.state.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Container fluid className="pb-2 mb-2">
                        {this.state.content}
                    </Container>
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={this.onClose}>Close</Button>
                </Modal.Footer>
            </Modal>
        );
    }
}
