import React from 'react'

import Button from 'react-bootstrap/Button'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'

import {is_valid_datetime} from '/common_lib'
import {AlertBox} from '/components/generic/alert/alert.jsx'

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
    theAlertBoxRef  = React.createRef();

    initDatasetValue = () => {
        return {
            name: '',
            major_version: "1.0",
            minor_version: 1,
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
        const mode = this.state.mode;
        this.setState({show: false}, () => {this.props.onSave(mode, dataset)});
    };

    canSave = () => {
        return this.state.dataset.name && this.state.dataset.team;
    };

    openDialog = (mode, dataset) => {
        if (mode === "view" || mode === "edit") {
            const ui_dataset = _.cloneDeep(dataset);
            if (ui_dataset.expiration_time === null) {
                ui_dataset.expiration_time = "";
            }

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
                                    <Form.Control as="textarea" rows={5}
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
                            <Form.Group as={Row} controlId="expiration_time">
                                <Form.Label column sm={2}>Expire</Form.Label>
                                <Col sm={10}>
                                    <Form.Control
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
                        </Form>
                    </Container>
                </Modal.Body>

                <Modal.Footer>
                    {(this.state.mode === "edit" || this.state.mode === "new") && <Button
                        variant="primary"
                        onClick={this.onSave}
                        disabled={!this.canSave()}
                    >
                        Save changes
                    </Button>}
                    <Button variant="secondary" onClick={this.onClose}>Close</Button>
                </Modal.Footer>
            </Modal>
        );
    }
}
