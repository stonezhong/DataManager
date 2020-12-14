import React from 'react'

import Button from 'react-bootstrap/Button'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import Card from 'react-bootstrap/Card'

import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

import {DataTable} from '/components/generic/datatable/main.jsx'
import {AppIcon} from '/components/generic/icons/main.jsx'


import "./application.scss"

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

    canSave = () => {
        return this.state.application.name && this.state.application.app_location;
    };

    render() {
        return (
            <Modal
                show={this.state.show}
                onHide={this.onClose}
                backdrop="static"
                size='xl'
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

                                    <CKEditor
                                        editor={ ClassicEditor }
                                        data={this.state.application.description}
                                        disabled={this.state.mode==='view'}
                                        type="classic"
                                        onChange={(event, editor) => {
                                            const v = editor.getData();
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
                    {(this.state.mode === "edit" || this.state.mode === "new") &&
                    <Button
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

/*********************************************************************************
 * Purpose: Show list of applications
 * TODO: pagination
 *
 * Props
 *     applications : a list of applications
 *
 */
export class ApplicationTable extends React.Component {
    theDataTableRef     = React.createRef();

    get_page = (offset, limit) => {
        return this.props.get_page(offset, limit, {});
    };

    render_name = application => {
        return <ApplicationLink application={application} />;
    };

    render_retired = application => (
        <div>
            <AppIcon type={application.retired?"dismiss":"checkmark"} className="icon16"/>
            <span className="ml-2">{application.retired?"Retired":""}</span>
        </div>
    );

    columns = {
        name:               {display: "Name", render_data: this.render_name},
        author:             {display: "Author"},
        team:               {display: "Team"},
        retired:            {display: "Active", render_data: this.render_retired},
    };

    refresh = () => this.theDataTableRef.current.refresh();
    reset   = () => this.theDataTableRef.current.reset();

    render() {
        return (
            <div>
                <DataTable
                    ref={this.theDataTableRef}
                    hover
                    bordered
                    className="application-table"
                    columns = {this.columns}
                    id_column = "id"
                    size = {this.props.size}
                    page_size={this.props.page_size}
                    fast_step_count={10}
                    get_page={this.get_page}
                />
            </div>
        )
    }
}

/*********************************************************************************
 * Purpose: Show an application
 *
 * Props
 *     application  : The application to show
 *
 */
export class ApplicationViewer extends React.Component {
    render() {
        return (
            <div>
                <Row>
                    <Col>
                        <Card border="success">
                            <Card.Body>
                                <div
                                    dangerouslySetInnerHTML={{__html: this.props.application.description}}
                                ></div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
                <Row className="mt-2">
                    <Col>
                        <Card border="success">
                            <Card.Body>
                                <table className="application-viewer-grid">
                                    <tbody>
                                        <tr>
                                            <td>Name</td>
                                            <td>{this.props.application.name}</td>
                                        </tr>
                                        <tr>
                                            <td>Author</td>
                                            <td>{this.props.application.author}</td>
                                        </tr>
                                        <tr>
                                            <td>team</td>
                                            <td>{this.props.application.team}</td>
                                        </tr>
                                        <tr>
                                            <td>Active</td>
                                            <td>
                                                <div>
                                                    <AppIcon
                                                        type={this.props.application.retired?"dismiss":"checkmark"}
                                                        className="icon16"
                                                    />
                                                    <span className="ml-2">
                                                        {this.props.application.retired?"Retired":""}
                                                    </span>

                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>Location</td>
                                            <td>{this.props.application.app_location}</td>
                                        </tr>
                                        <tr>
                                            <td>Sys App ID</td>
                                            <td>{this.props.application.sys_app_id}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </div>
        )
    }
}

/*********************************************************************************
 * Purpose: Link to an application
 *
 * Props
 *     application: The application to link to
 *
 */

export class ApplicationLink extends React.Component {
    render() {
        return (
            <a href={`/explorer/application?id=${this.props.application.id}`}>
                { (this.props.application.sys_app_id === null)?this.props.application.name:<b>{this.props.application.name}</b> }
            </a>
        );
    }
}

