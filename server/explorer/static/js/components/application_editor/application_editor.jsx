import React from 'react'

import Button from 'react-bootstrap/Button'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'

const _ = require("lodash");

/*********************************************************************************
 * Purpose: Edit an Application
 *
 * Props
 *     onSave   : called when user hit "Save Changes", onSave(mode, application) is called.
 *                mode is either "new" or "edit"
 *     onCancel : called when user hit "Close" or close the dialog without save the change
 *
 */

export class ApplicationEditor extends React.Component {
    initApplicationValue = () => {
        return {
            name: '',
            description: '',
            team: '',
            retired: false,
            app_location: ''
        }
    };

    state = {
        show: false,
        mode: "new",      // either edit or new
        application: this.initApplicationValue(),
    };

    onSave = () => {
        const application = _.cloneDeep(this.state.application);
        const mode = this.state.mode;
        this.setState({show: false}, () => {this.props.onSave(mode, application)});
    };

    onClose = () => {
        if (this.props.onCancel) {
            this.setState({show: false}, this.props.onCancel);
        } else {
            this.setState({show: false});
        }
    };

    openDialog = (application) => {
        if (application) {
            this.setState({
                show: true,
                mode: 'edit',
                application: application
            })
        } else {
            this.setState({
                show: true,
                mode: 'new',
                application: this.initApplicationValue()
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
                        {this.state.mode=="edit"?"Edit Application":"New Application"}
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <Form>
                        <Form.Group as={Row} controlId="name">
                            <Form.Label column sm={2}>Name</Form.Label>
                                <Col sm={10}>
                            <Form.Control
                                disabled = {this.state.mode=='edit'}
                                defaultValue={this.state.application.name}
                                onChange={(event) => {
                                    const v = event.target.value;
                                    this.setState(
                                        state => {
                                            state.application.name = v;
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
                                    defaultValue={this.state.application.team}
                                    onChange={(event) => {
                                        const v = event.target.value;
                                        this.setState(
                                            state => {
                                                state.application.team = v;
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
                                    defaultValue={this.state.application.description}
                                    onChange={(event) => {
                                        const v = event.target.value;
                                        this.setState(
                                            state => {
                                                state.application.description = v;
                                                return state;
                                            }
                                        )
                                    }}
                                />
                            </Col>
                        </Form.Group>
                        <Form.Group as={Row} controlId="app_location">
                            <Form.Label column sm={2}>Location</Form.Label>
                            <Col sm={10}>
                                <Form.Control
                                    defaultValue={this.state.application.app_location}
                                    onChange={(event) => {
                                        const v = event.target.value;
                                        this.setState(
                                            state => {
                                                state.application.app_location = v;
                                                return state;
                                            }
                                        )
                                    }}
                                />
                            </Col>
                        </Form.Group>
                        <Form.Group as={Row} controlId="retired">
                            <Form.Label column sm={2}>Retired</Form.Label>
                            <Col sm={10}>
                                <Form.Check type="checkbox"
                                    className="c-vc"
                                    disabled = {this.state.mode=='new'}
                                    defaultValue={this.state.application.retired}
                                    onChange={(event) => {
                                        const v = event.target.checked;
                                        this.setState(
                                            state => {
                                                state.application.retired = v;
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
