import React from 'react'

import Button from 'react-bootstrap/Button'
import Container from 'react-bootstrap/Container'
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

    onClose = () => {
        this.setState({show: false});
    };

    onSave = () => {
        const application = _.cloneDeep(this.state.application);
        const mode = this.state.mode;
        this.setState({show: false}, () => {this.props.onSave(mode, application)});
    };


    openDialog = (mode, application) => {
        if (mode === "view" || mode === "edit") {
            this.setState({
                show: true,
                mode: mode,
                application: application
            })
        } else if (mode === "new") {
            this.setState({
                show: true,
                mode: mode,
                application: this.initApplicationValue()
            })
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };


    get_title = () => {
        if (this.state.mode === "new") {
            return "new Application";
        } else if (this.state.mode === "edit") {
            return "edit Application";
        } else if (this.state.mode === "view") {
            return "Application"
        } else {
            // wrong parameter
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
                                        value={this.state.application.name}
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
                                        disabled = {this.state.mode==='view'}
                                        value={this.state.application.team}
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
                                        disabled = {this.state.mode==='view'}
                                        value={this.state.application.description}
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
                                        disabled = {this.state.mode==='view'}
                                        value={this.state.application.app_location}
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
                                        disabled = {this.state.mode=='new'||this.state.mode==="view"}
                                        checked={this.state.application.retired}
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
