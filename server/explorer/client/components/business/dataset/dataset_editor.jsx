import React from 'react'

import Button from 'react-bootstrap/Button'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'

import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

import {is_valid_datetime} from '/common_lib'
import {AlertBox} from '/components/generic/alert/alert.jsx'

const _ = require("lodash");

/*********************************************************************************
 * Purpose: Edit a Dataset
 *
 * Props
 *     onSave   : called when user hit "Save Changes", onSave(mode, dataset) is called.
 *                mode is either "new" or "edit". On save must return a promise and the
 *                promise must be resovled when save is done.
 *
 */

export class DatasetEditor extends React.Component {
    theAlertBoxRef  = React.createRef();

    initDatasetValue = () => {
        return {
            name: '',
            major_version: "1.0",
            minor_version: "1",
            description: "",
            team: "",
            expiration_time: "",
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
        if (!is_valid_datetime(this.state.dataset.expiration_time, true)) {
            this.theAlertBoxRef.current.show("Expire MUST be in format YYYY-MM-DD HH:MM:SS, for example: 2020-10-03 00:00:00");
            return
        }

        const dataset = _.cloneDeep(this.state.dataset);
        if (dataset.expiration_time === "") {
            dataset.expiration_time = null;
        }
        dataset.minor_version = parseInt(dataset.minor_version);
        const mode = this.state.mode;

        this.props.onSave(mode, dataset).then(
            this.onClose
        ).catch(error => {
            this.theAlertBoxRef.current.show(error.message);
        });
    };

    canSave = () => {
        // minor version must be natural number
        if (!/^[1-9]\d*$/.test(this.state.dataset.minor_version)) {
            return false;
        }
        return this.state.dataset.major_version && this.state.dataset.name && this.state.dataset.team;
    };

    openDialog = (mode, dataset) => {
        if (mode === "view" || mode === "edit") {
            const ui_dataset = _.cloneDeep(dataset);
            if (ui_dataset.expiration_time === null) {
                ui_dataset.expiration_time = "";
            }

            ui_dataset.minor_version = ui_dataset.minor_version.toString();

            this.setState({
                show: true,
                mode: mode,
                dataset: ui_dataset
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
                        <AlertBox ref={this.theAlertBoxRef}/>
                        <Form.Row>
                            <Form.Group as={Col} controlId="name">
                                <Form.Label>Name</Form.Label>
                                <Form.Control
                                    size="sm"
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
                            </Form.Group>
                            <Form.Group as={Col} controlId="team">
                                <Form.Label>Team</Form.Label>
                                <Form.Control
                                    size="sm"
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
                            </Form.Group>
                        </Form.Row>
                        <Form.Row>
                            <Form.Group as={Col} controlId="major_version">
                                <Form.Label>Major Version</Form.Label>
                                <Form.Control
                                    size="sm"
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
                            </Form.Group>
                            <Form.Group as={Col} controlId="minor_version">
                                <Form.Label>Minor Version</Form.Label>
                                <Form.Control
                                    size="sm"
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
                            </Form.Group>
                        </Form.Row>

                        <Form.Row>
                            <Form.Group as={Col} controlId="description">
                                <Form.Label>Description</Form.Label>
                                <CKEditor
                                    editor={ ClassicEditor }
                                    data={this.state.dataset.description}
                                    readOnly={this.state.mode==='view'}
                                    type="classic"
                                    onChange={(event, editor) => {
                                        const v = editor.getData();
                                        this.setState(
                                            state => {
                                                state.dataset.description = v;
                                                return state;
                                            }
                                        )
                                    }}
                                />
                            </Form.Group>
                        </Form.Row>
                        <Form.Group as={Row} controlId="expiration_time">
                            <Form.Label column sm={2}>Expire</Form.Label>
                            <Col sm={10}>
                                <Form.Control
                                    size="sm"
                                    disabled = {this.state.mode==='new' || this.state.mode==='view'}
                                    value={this.state.dataset.expiration_time}
                                    onChange={(event) => {
                                        const v = event.target.value;
                                        this.setState(
                                            state => {
                                                state.dataset.expiration_time = v;
                                                return state;
                                            }
                                        )
                                    }}
                                    placeholder="YYYY-mm-dd HH:MM:SS"
                                />
                            </Col>
                        </Form.Group>
                    </Container>
                </Modal.Body>

                <Modal.Footer>
                    {(this.state.mode === "edit" || this.state.mode === "new") && <Button
                        variant="primary"
                        size="sm"
                        onClick={this.onSave}
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
