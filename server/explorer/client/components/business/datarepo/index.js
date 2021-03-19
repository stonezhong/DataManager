import React from 'react'

import Button from 'react-bootstrap/Button'
import Container from 'react-bootstrap/Container'
import Card from 'react-bootstrap/Card'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import Tabs from 'react-bootstrap/Tabs'
import Tab from 'react-bootstrap/Tab'

import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { v4 as uuidv4 } from 'uuid';

import {DataTable} from '/components/generic/datatable/main.jsx'

import {is_json_string, bless_modal} from '/common_lib.js'

import "./datarepo.scss"

const _ = require("lodash");

const REPO_TYPE_BY_ID = {
    1: "Local File System",
    2: "Hadoop File System",
    3: "JDBC Data Source"
}

function mask_password_for_repo_context(context) {
    const obj_context = JSON.parse(context);
    if ('password' in obj_context) {
        obj_context.password = '****';
    }
    return JSON.stringify(obj_context, null, 2);
}

function get_repo_context_for_display(context) {
    return <pre>{ mask_password_for_repo_context(context) }</pre>
}

/*********************************************************************************
 * Purpose: Show list of data repos
 *
 * Props
 *     datarepos : a list of datarepo
 *
 */
export class DataRepoTable extends React.Component {
    theDataTableRef     = React.createRef();

    get_page = (offset, limit) => {
        return this.props.get_page(offset, limit, {});
    };

    render_name = datarepo => {
        return <DataRepoLink datarepo={datarepo} />;
    };

    render_type = datarepo => {
        return REPO_TYPE_BY_ID[datarepo.type];
    };

    render_context = datarepo => get_repo_context_for_display(datarepo.context);

    columns = {
        name:               {display: "Name",       render_data: this.render_name},
        type:               {display: "Type",       render_data: this.render_type},
        context:            {display: "Details",    render_data: this.render_context},
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
                    className="datarepo-table"
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
 * Purpose: Edit a DataRepo
 *
 * Props
 *     onSave   : called when user hit "Save Changes", onSave(mode, datarepo) is called.
 *                mode is either "new" or "edit"
 *
 */
export class DataRepoEditor extends React.Component {
    initDataRepoValue = () => {
        return {
            name: '',
            description: '',
            type: 2,
            context: '{}'
        }
    };

    modal_id = uuidv4();

    state = {
        show: false,
        mode: "new",      // either edit or new
        datarepo: this.initDataRepoValue(),
    };

    onClose = () => {
        this.setState({show: false});
    };

    onSave = () => {
        const datarepo = _.cloneDeep(this.state.datarepo);
        const mode = this.state.mode;
        this.setState({show: false}, () => {this.props.onSave(mode, datarepo)});
    };


    openDialog = (mode, datarepo) => {
        if (mode === "view" || mode === "edit") {
            const datarepo2 = _.cloneDeep(datarepo);
            datarepo2.context = mask_password_for_repo_context(datarepo2.context);

            this.setState({
                show: true,
                mode: mode,
                datarepo: datarepo2
            }, () => bless_modal(this.modal_id))
        } else if (mode === "new") {
            this.setState({
                show: true,
                mode: mode,
                datarepo: this.initDataRepoValue()
            }, () => bless_modal(this.modal_id))
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };


    get_title = () => {
        if (this.state.mode === "new") {
            return "new Data Repository";
        } else if (this.state.mode === "edit") {
            return "edit Data Repository";
        } else if (this.state.mode === "view") {
            return "Data Repository"
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };

    canSave = () => {
        return this.state.datarepo.name && is_json_string(this.state.datarepo.context);
    };

    render() {
        return (
            <Modal
                show={this.state.show}
                onHide={this.onClose}
                backdrop="static"
                scrollable
                animation={false}
                dialogClassName="standard-modal data-repo-editor-modal"
                data-modal-id={this.modal_id}
            >
                <Modal.Header closeButton>
                    <Modal.Title>{this.get_title()}</Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <Container fluid  className="pb-2 mb-2">
                        <Tabs defaultActiveKey="BasicInfo" transition={false}>
                            <Tab eventKey="BasicInfo" title="Basic Info">
                                <Container className="pt-2">
                                    <Form.Group as={Row} controlId="datarepo-name">
                                        <Form.Label column sm={2}>Name</Form.Label>
                                        <Col sm={10}>
                                            <Form.Control
                                                size="sm"
                                                disabled = {this.state.mode==='edit'||this.state.mode==='view'}
                                                value={this.state.datarepo.name}
                                                onChange={(event) => {
                                                    const v = event.target.value;
                                                    this.setState(
                                                        state => {
                                                            state.datarepo.name = v;
                                                            return state;
                                                        }
                                                    )
                                                }}
                                            />
                                        </Col>
                                    </Form.Group>
                                    <Form.Group as={Row} controlId="datarepo-type">
                                        <Form.Label column sm={2}>Type</Form.Label>
                                        <Col sm={10}>
                                            <Form.Control
                                                as="select"
                                                size="sm"
                                                disabled = {this.state.mode==='view'}
                                                value={this.state.datarepo.type}
                                                onChange={(event) => {
                                                    const v = event.target.value;
                                                    this.setState(
                                                        state => {
                                                            state.datarepo.type = parseInt(v);
                                                            return state;
                                                        }
                                                    )
                                                }}
                                            >
                                                {
                                                    Object.keys(REPO_TYPE_BY_ID).map(
                                                        i => <option key={REPO_TYPE_BY_ID[i]} value={i}>{REPO_TYPE_BY_ID[i]}</option>
                                                    )
                                                }
                                            </Form.Control>
                                        </Col>
                                    </Form.Group>
                                    <Form.Group as={Row} controlId="datarepo-context">
                                        <Form.Label column sm={2}>Details</Form.Label>
                                        <Col sm={10}>
                                            <Form.Control
                                                as="textarea"
                                                rows="5"
                                                size="sm"
                                                className="monofont"
                                                disabled = {this.state.mode==='view'}
                                                value={this.state.datarepo.context}
                                                onChange={(event) => {
                                                    const v = event.target.value;
                                                    this.setState(
                                                        state => {
                                                            state.datarepo.context = v;
                                                            return state;
                                                        }
                                                    )
                                                }}
                                            />
                                        </Col>
                                    </Form.Group>
                                </Container>
                            </Tab>
                            <Tab eventKey="Description" title="Description">
                                <Container className="pt-2">
                                    <Row>
                                        <Col>
                                            <CKEditor
                                                editor={ ClassicEditor }
                                                data={this.state.datarepo.description}
                                                disabled={this.state.mode==='view'}
                                                type="classic"
                                                onChange={(event, editor) => {
                                                    const v = editor.getData();
                                                    this.setState(
                                                        state => {
                                                            state.datarepo.description = v;
                                                            return state;
                                                        }
                                                    )
                                                }}
                                            />
                                        </Col>
                                    </Row>
                                </Container>
                            </Tab>
                        </Tabs>
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
 * Purpose: Show a data repo
 *
 * Props
 *     datarepo  : The data repo to show
 *
 */
export class DataRepoViewer extends React.Component {
    render() {
        return (
            <div>
                <Row>
                    <Col>
                        <Card border="success">
                            <Card.Body>
                                <div
                                    dangerouslySetInnerHTML={{__html: this.props.datarepo.description}}
                                ></div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
                <Row className="mt-2">
                    <Col>
                        <Card border="success">
                            <Card.Body>
                                <table className="datarepo-viewer-grid">
                                    <tbody>
                                        <tr>
                                            <td>Name</td>
                                            <td>{this.props.datarepo.name}</td>
                                        </tr>
                                        <tr>
                                            <td>Type</td>
                                            <td>{REPO_TYPE_BY_ID[this.props.datarepo.type]}</td>
                                        </tr>
                                        <tr>
                                            <td>Details</td>
                                            <td>
                                                {
                                                    get_repo_context_for_display(this.props.datarepo.context)
                                                }
                                            </td>
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
 * Purpose: Link to a data repo
 *
 * Props
 *     datarepo: The data repo to link to
 *
 */

export class DataRepoLink extends React.Component {
    render() {
        return (
            <a href={`/explorer/datarepo?id=${this.props.datarepo.id}`}>
                { this.props.datarepo.name }
            </a>
        );
    }
}

