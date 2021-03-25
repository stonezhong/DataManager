import React from 'react';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';

import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

import {DataTable} from '/components/generic/datatable/main.jsx';

import {is_json_string} from '/common_lib.js';
import {StandardDialogbox} from '/components/generic/dialogbox/standard.jsx';
import "./datalake.scss";

const _ = require("lodash");

/*********************************************************************************
 * Purpose: Edit an Datalake
 *
 * Props
 *     onSave   : called when user hit "Save Changes", onSave(mode, datalake) is called.
 *                mode is either "new" or "edit"
 *
 */
export class DatalakeEditor extends StandardDialogbox {
    initDatalakeValue = () => {
        return {
            name: '-- enter name --',
            description: '',
            is_public: false,
            config: '{}'
        }
    };

    dialogClassName = "datalake-editor-modal";

    isNameValid = (datalake) => {
        return datalake.name.trim().length > 0;
    }

    isConfigValid = (datalake) => {
        return is_json_string(datalake.config);
    }


    onSave = () => {
        const {datalake, mode} = this.state.payload;

        const ui_datalake = _.cloneDeep(datalake);
        return this.props.onSave(mode, ui_datalake);
    };

    canSave = () => {
        const {datalake} = this.state.payload;

        return this.isNameValid(datalake) &&
            this.isConfigValid(datalake);
    };

    hasSave = () => {
        const {mode} = this.state.payload;
        return (mode === "edit" || mode === "new");
    };

    onOpen = openArgs => {
        const {mode, datalake} = openArgs;

        if (mode === "view" || mode === "edit") {
            return {
                mode: mode,
                datalake: datalake
            };
        } else if (mode === "new") {
            return {
                mode: mode,
                datalake: this.initDatalakeValue()
            }
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };

    getTitle = () => {
        const {mode} = this.state.payload;
        if (mode === "new") {
            return "new Datalake";
        } else if (mode === "edit") {
            return "edit Datalake";
        } else if (mode === "view") {
            return "Datalake"
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };


    renderBody = () => {
        const {datalake, mode} = this.state.payload;
        return (
            <div>
                <Form>
                    <Form.Group as={Row} controlId="name">
                        <Form.Label column sm={2}>Name</Form.Label>
                        <Col sm={10}>
                            <Form.Control
                                size="sm"
                                disabled = {mode==='edit'||mode==='view'}
                                value={datalake.name}
                                isInvalid={!this.isNameValid(datalake)}
                                onChange={(event) => {
                                    const v = event.target.value;
                                    this.setState(
                                        state => {
                                            state.payload.datalake.name = v;
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
                                data={datalake.description}
                                disabled={mode==='view'}
                                type="classic"
                                onChange={(event, editor) => {
                                    const v = editor.getData();
                                    this.setState(
                                        state => {
                                            state.payload.datalake.description = v;
                                            return state;
                                        }
                                    )
                                }}
                            />
                        </Col>
                    </Form.Group>
                    <Form.Group as={Row} controlId="datarepo-context">
                        <Form.Label column sm={2}>Config</Form.Label>
                        <Col sm={10}>
                            <Form.Control
                                as="textarea"
                                rows="8"
                                size="sm"
                                className="monofont"
                                disabled = {mode==='view'}
                                value={datalake.config}
                                isInvalid={!this.isConfigValid(datalake)}
                                onChange={(event) => {
                                    const v = event.target.value;
                                    this.setState(
                                        state => {
                                            state.payload.datalake.config = v;
                                            return state;
                                        }
                                    )
                                }}
                            />
                            <Form.Control.Feedback tooltip type="invalid">
                                Must be a valid JSON object.
                            </Form.Control.Feedback>
                        </Col>
                    </Form.Group>
                    <Form.Group as={Row} controlId="is_public">
                        <Form.Label column sm={2}>Is Public</Form.Label>
                        <Col sm={10}>
                            <Form.Check type="checkbox"
                                className="c-vc"
                                disabled = {mode==="view"}
                                checked={datalake.is_public}
                                onChange={(event) => {
                                    const v = event.target.checked;
                                    this.setState(
                                        state => {
                                            state.payload.datalake.is_public = v;
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
 * Purpose: Show list of subscriptions
 * TODO: pagination
 *
 * Props
 *     subscriptions : a list of subscriptions
 *
 */
 export class SubscriptionTable extends React.Component {
    theDataTableRef     = React.createRef();

    get_page = (offset, limit) => {
        return this.props.get_page(offset, limit, {});
    };

    render_name = subscription => {
        return <DatalakeLink datalake={subscription.tenant} />;
    };

    render_is_admin = subscription => {
        return <div>{subscription.is_admin?"Yes":"No"}</div>;
    };

    columns = {
        name:               {display: "Name", render_data: this.render_name},
        is_admin:           {display: "Is Admin", render_data: this.render_is_admin},
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
                    className="subscription-table"
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
 * Purpose: Link to an application
 *
 * Props
 *     application: The application to link to
 *
 */

 export class DatalakeLink extends React.Component {
    render() {
        return (
            <a href={`/explorer/${this.props.datalake.id}/datasets`}>
                {this.props.datalake.name}
            </a>
        );
    }
}

