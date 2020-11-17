import React from 'react'

import Button from 'react-bootstrap/Button'
import Container from 'react-bootstrap/Container'
import Modal from 'react-bootstrap/Modal'

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

    onClose = () => {
        this.setState({show: false});
    };

    openDialog = (title, content) => {
        this.setState({
            show: true,
            title: title,
            content: content,
        })
    };

    render() {
        const dlg_props = {};
        _.forEach(['backdrop', 'size', 'scrollable'], key => {
            if (key in this.props) {
                dlg_props[key] = this.props[key];
            }
        });

        return (
            <Modal
                show={this.state.show}
                onHide={this.onClose}
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
