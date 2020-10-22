import React from 'react'

import Button from 'react-bootstrap/Button'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import Table from 'react-bootstrap/Table'
import Modal from 'react-bootstrap/Modal'

import classNames from 'classnames'
import * as Icon from 'react-bootstrap-icons'

const _ = require("lodash");

/*********************************************************************************
 * Purpose: Edit a Dataset
 *
 * Props
 *     onSave   : called when user hit "Save Changes", onSave(mode, dataset) is called.
 *                mode is either "new" or "edit"
 *
 */

export class DatasetEditor extends React.Component {
    initDatasetValue = () => {
        return {
            name: '',
            major_version: "1.0",
            minor_version: 1,
            description: "",
            team: "",
        }
    };

    state = {
        show: false,
        mode: "new",      // either edit or new
        dataset: this.initDatasetValue(),
    };

    onClose = () => {
        this.setState({show: false});
    };

    onSave = () => {
        const dataset = _.cloneDeep(this.state.dataset);
        const mode = this.state.mode;
        this.setState({show: false}, () => {this.props.onSave(mode, dataset)});
    };


    openDialog = (mode, dataset) => {
        if (mode === "view" || mode === "edit") {
            this.setState({
                show: true,
                mode: mode,
                dataset: dataset
            })
        } else if (mode === "new") {
            this.setState({
                show: true,
                mode: mode,
                dataset: this.initDatasetValue()
            })
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };

    get_title = () => {
        if (this.state.mode === "new") {
            return "new Dataset";
        } else if (this.state.mode === "edit") {
            return "edit Dataset";
        } else if (this.state.mode === "view") {
            return "Dataset"
        } else {
            console.assert(false, "mode must be edit, view or new");
        }
    };

    render() {
        return (
            <Modal
                show={this.state.show}
                onHide={this.onClose}
                backdrop="static"
                size='lg'
                scrollable
            >
                <Modal.Header closeButton>
                    <Modal.Title>{this.get_title()}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Container fluid className="pb-2 mb-2">
                        <Form>
                            <Form.Group as={Row} controlId="name">
                                <Form.Label column sm={2}>Name</Form.Label>
                                <Col sm={10}>
                                    <Form.Control
                                        disabled = {this.state.mode==='edit'||this.state.mode==='view'}
                                        value={this.state.dataset.name}
                                        onChange={(event) => {
                                            const v = event.target.value;
                                            this.setState(
                                                state => {
                                                    state.dataset.name = v;
                                                    return state;
                                                }
                                            )
                                        }}
                                    />
                                </Col>
                            </Form.Group>
                            <Form.Group as={Row} controlId="team">
                                <Form.Label column sm={2}>Team</Form.Label>
                                <Col sm={10}>
                                    <Form.Control
                                        disabled = {this.state.mode==='view'}
                                        value={this.state.dataset.team}
                                        onChange={(event) => {
                                            const v = event.target.value;
                                            this.setState(
                                                state => {
                                                    state.dataset.team = v;
                                                    return state;
                                                }
                                            )
                                        }}
                                    />
                                </Col>
                            </Form.Group>
                            <Form.Group as={Row} controlId="major_version">
                                <Form.Label column sm={2}>Major Version</Form.Label>
                                <Col sm={10}>
                                    <Form.Control
                                        disabled = {this.state.mode==='edit'||this.state.mode==='view'}
                                        value={this.state.dataset.major_version}
                                        onChange={(event) => {
                                            const v = event.target.value;
                                            this.setState(
                                                state => {
                                                    state.dataset.major_version = v;
                                                    return state;
                                                }
                                            )
                                        }}
                                    />
                                </Col>
                            </Form.Group>
                            <Form.Group as={Row} controlId="minor_version">
                                <Form.Label column sm={2}>Minor Version</Form.Label>
                                <Col sm={10}>
                                    <Form.Control
                                        disabled = {this.state.mode==='edit'||this.state.mode==='view'}
                                        value={this.state.dataset.minor_version}
                                        onChange={(event) => {
                                            const v = event.target.value;
                                            this.setState(
                                                state => {
                                                    state.dataset.minor_version = v;
                                                    return state;
                                                }
                                            )
                                        }}
                                    />
                                </Col>
                            </Form.Group>
                            <Form.Group as={Row} controlId="description">
                                <Form.Label column sm={2}>Description</Form.Label>
                                <Col sm={10}>
                                    <Form.Control as="textarea" rows={10}
                                        disabled = {this.state.mode==='view'}
                                        value={this.state.dataset.description}
                                        onChange={(event) => {
                                            const v = event.target.value;
                                            this.setState(
                                                state => {
                                                    state.dataset.description = v;
                                                    return state;
                                                }
                                            )
                                        }}
                                    />
                                </Col>
                            </Form.Group>
                        </Form>
                    </Container>
                </Modal.Body>

                <Modal.Footer>
                    {(this.state.mode === "edit" || this.state.mode === "new") && <Button variant="primary" onClick={this.onSave}>Save changes</Button>}
                    <Button variant="secondary" onClick={this.onClose}>Close</Button>
                </Modal.Footer>
            </Modal>
        );
    }
}
