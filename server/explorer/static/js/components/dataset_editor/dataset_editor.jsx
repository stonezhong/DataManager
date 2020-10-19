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
 *     onCancel : called when user hit "Close" or close the dialog without save the change
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

    onSave = () => {
        const dataset = _.cloneDeep(this.state.dataset);
        const mode = this.state.mode;
        this.setState({show: false}, () => {this.props.onSave(mode, dataset)});
    };

    onClose = () => {
        if (this.props.onCancel) {
            this.setState({show: false}, this.props.onCancel);
        } else {
            this.setState({show: false});
        }
    };

    openDialog = (dataset) => {
        if (dataset) {
            this.setState({
                show: true,
                mode: 'edit',
                dataset: dataset
            })
        } else {
            this.setState({
                show: true,
                mode: 'new',
                dataset: this.initDatasetValue()
            })
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
                    <Modal.Title>
                        {this.state.mode=="edit"?"Edit Dataset":"New Dataset"}
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <Form>
                        <Form.Group as={Row} controlId="name">
                            <Form.Label column sm={2}>Name</Form.Label>
                            <Col sm={10}>
                                <Form.Control
                                    disabled = {this.state.mode=='edit'}
                                    defaultValue={this.state.dataset.name}
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
                                    defaultValue={this.state.dataset.team}
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
                                    disabled = {this.state.mode=='edit'}
                                    defaultValue={this.state.dataset.major_version}
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
                                    disabled = {this.state.mode=='edit'}
                                    defaultValue={this.state.dataset.minor_version}
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
                                    defaultValue={this.state.dataset.description}
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
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={this.onClose}>Close</Button>
                    <Button variant="primary" onClick={this.onSave}>Save changes</Button>
                </Modal.Footer>
            </Modal>
        );
    }
}
