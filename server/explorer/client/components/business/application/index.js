import React from 'react';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';

import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

import {DataTable} from '/components/generic/datatable/main.jsx';
import {AppIcon} from '/components/generic/icons/main.jsx';

import {StandardDialogbox} from '/components/generic/dialogbox/standard.jsx';
import "./application.scss";

const _ = require("lodash");

/*********************************************************************************
 * Purpose: Edit an Application
 *
 * Props
 *     onSave   : called when user hit "Save Changes", onSave(mode, application) is called.
 *                mode is either "new" or "edit"
 *
 */
export class ApplicationEditor extends StandardDialogbox {
    initApplicationValue = () => {
        return {
            name: '-- enter name --',
            description: '',
            team: '-- enter team --',
            retired: false,
            app_location: '-- enter location --'
        }
    };

    dialogClassName = "application-editor-modal";

    isNameValid = (application) => {
        return application.name.trim().length > 0;
    }

    isTeamValid = (application) => {
        return application.team.trim().length > 0;
    }

    isLocationValid = (application) => {
        return application.app_location.trim().length > 0;
    }

    onSave = () => {
        const {application, mode} = this.state.payload;

        const ui_application = _.cloneDeep(application);
        return this.props.onSave(mode, ui_application);
    };

    canSave = () => {
        const {application} = this.state.payload;

        return this.isNameValid(application) &&
            this.isTeamValid(application) &&
            this.isLocationValid(application);
    };

    hasSave = () => {
        const {mode} = this.state.payload;
        return (mode === "edit" || mode === "new");
    };

    onOpen = openArgs => {
        const {mode, application} = openArgs;

        if (mode === "view" || mode === "edit") {
            return {
                mode: mode,
                application: application
            };
        } else if (mode === "new") {
            return {
                mode: mode,
                application: this.initApplicationValue()
            }
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };

    getTitle = () => {
        const {mode} = this.state.payload;
        if (mode === "new") {
            return "new Application";
        } else if (mode === "edit") {
            return "edit Application";
        } else if (mode === "view") {
            return "Application"
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };


    renderBody = () => {
        const {application, mode} = this.state.payload;
        return (
            <div>
                <Form>
                    <Form.Group as={Row} controlId="name">
                        <Form.Label column sm={2}>Name</Form.Label>
                        <Col sm={10}>
                            <Form.Control
                                size="sm"
                                disabled = {mode==='edit'||mode==='view'}
                                value={application.name}
                                isInvalid={!this.isNameValid(application)}
                                onChange={(event) => {
                                    const v = event.target.value;
                                    this.setState(
                                        state => {
                                            state.payload.application.name = v;
                                            return state;
                                        }
                                    )
                                }}
                            />
                            <Form.Control.Feedback tooltip type="invalid">
                                Cannot be empty.
                            </Form.Control.Feedback>
                        </Col>
                    </Form.Group>
                    <Form.Group as={Row} controlId="team">
                        <Form.Label column sm={2}>Team</Form.Label>
                        <Col sm={10}>
                            <Form.Control
                                size="sm"
                                disabled = {mode==='view'}
                                value={application.team}
                                isInvalid={!this.isTeamValid(application)}
                                onChange={(event) => {
                                    const v = event.target.value;
                                    this.setState(
                                        state => {
                                            state.payload.application.team = v;
                                            return state;
                                        }
                                    )
                                }}
                            />
                            <Form.Control.Feedback tooltip type="invalid">
                                Cannot be empty.
                            </Form.Control.Feedback>
                        </Col>
                    </Form.Group>
                    <Form.Group as={Row} controlId="description">
                        <Form.Label column sm={2}>Description</Form.Label>
                        <Col sm={10}>
                            <CKEditor
                                editor={ ClassicEditor }
                                data={application.description}
                                disabled={mode==='view'}
                                type="classic"
                                onChange={(event, editor) => {
                                    const v = editor.getData();
                                    this.setState(
                                        state => {
                                            state.payload.application.description = v;
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
                                size="sm"
                                disabled = {mode==='view'}
                                value={application.app_location}
                                isInvalid={!this.isLocationValid(application)}
                                onChange={(event) => {
                                    const v = event.target.value;
                                    this.setState(
                                        state => {
                                            state.payload.application.app_location = v;
                                            return state;
                                        }
                                    )
                                }}
                            />
                            <Form.Control.Feedback tooltip type="invalid">
                                Cannot be empty.
                            </Form.Control.Feedback>
                        </Col>
                    </Form.Group>
                    <Form.Group as={Row} controlId="retired">
                        <Form.Label column sm={2}>Retired</Form.Label>
                        <Col sm={10}>
                            <Form.Check type="checkbox"
                                className="c-vc"
                                disabled = {mode=='new'||mode==="view"}
                                checked={application.retired}
                                onChange={(event) => {
                                    const v = event.target.checked;
                                    this.setState(
                                        state => {
                                            state.payload.application.retired = v;
                                            return state;
                                        }
                                    )
                                }}
                            />
                        </Col>
                    </Form.Group>
                </Form>
            </div>
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

