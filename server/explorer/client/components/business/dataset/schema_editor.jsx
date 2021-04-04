import React from 'react';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Table from 'react-bootstrap/Table'
import * as Icon from 'react-bootstrap-icons'

import {StandardDialogbox} from '/components/generic/dialogbox/standard.jsx';
import {TreeTable} from '/components/generic/datatable/treetable.jsx';
import "./dataset.scss";

const _ = require("lodash");

export function has_schema(dataset) {
    if (!dataset.schema) {
        return false;
    }
    try {
        const schema = JSON.parse(dataset.schema.trim());
        return true;
    }
    catch (e) {
        return false;
    }
}

/*********************************************************************************
 * Purpose: Edit a Dataset's Schema
 *
 * Props
 *     onSave   : called when user hit "Save Changes", onSave(mode, dataset) is called.
 *                mode is either "new" or "edit". On save must return a promise and the
 *                promise must be resovled when save is done.
 *
 */

export class SchemaEditor extends StandardDialogbox {
    dialogClassName = "schema-editor-modal";

    onSave = () => {
        return this.props.onSave(
            this.state.payload.mode,
            this.state.payload.dataset.id,
            JSON.stringify(this.state.payload.schema_ext)
        );
    };

    canSave = () => {
        return true;
    };

    hasSave = () => {
        const {mode} = this.state.payload;
        return (mode === "edit");
    };

    onOpen = openArgs => {
        const {mode, dataset} = openArgs;
        if (mode === "view" || mode === "edit") {
            const ui_dataset = _.cloneDeep(dataset);
            if (ui_dataset.expiration_time === null) {
                ui_dataset.expiration_time = "";
            }
            ui_dataset.minor_version = ui_dataset.minor_version.toString();
            let schema = {
                type: "struct",
                fields: []
            };
            let schema_ext = {
                field_descriptions: {},
                pk: null,
                unique: [],
                joinable: []
            };
            if (ui_dataset.schema) {
                try {
                    schema = JSON.parse(ui_dataset.schema.trim());
                }
                catch (e) {
                    // pass
                }
                try {
                    schema_ext = JSON.parse(ui_dataset.schema_ext.trim());
                }
                catch (e) {
                    // pass
                }
            }
            return {
                mode: mode,
                dataset: ui_dataset,
                schema: schema,
                schema_ext: schema_ext,
            };
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };

    getTitle = () => {
        const {mode} = this.state.payload;
        if (mode === "edit") {
            return "edit Schema";
        } else if (mode === "view") {
            return "Schema"
        } else {
            console.assert(false, "mode must be edit, view or new");
        }
    };

    field_to_node = (field, prefix) => {
        // payload has following property:
        //     nullable, boolean
        //     is_array, boolean
        //     type, string
        const node = {
            id: prefix?`${prefix}.${field.name}`:field.name,
            payload: {
                name: field.name,
                nullable: field.nullable,
            }
        };
        node.payload.id = node.id;

        if (typeof(field.type)==='object') {
            if (field.type.type === 'struct') {
                const children = [];
                for (const child_field of field.type.fields) {
                    const child_node = field_to_node(child_field, node.id);
                    children.push(child_node);
                }
                node.children = children;
                node.payload.is_array = false;
                node.payload.type = 'struct';
            } else if (field.type.type === 'array') {
                if (typeof(field.type.elementType) === 'object') {
                    if (field.type.elementType.type === 'struct') {
                        const children = [];
                        for (const child_field of field.type.elementType.fields) {
                            const child_node = field_to_node(child_field, node.id);
                            children.push(child_node);
                        }
                        node.children = children;
                        node.payload.is_array = true;
                        node.payload.type = 'struct';
                    } else {
                        throw new "bad schema";
                    }
                } else {
                    node.payload.type = field.type.elementType;
                    node.payload.is_array = true;
                }
            } else {
                throw new "bad schema";
            }
        } else {
            node.payload.type = field.type;
            node.payload.is_array = false;
        }

        return node;
    };

    get_field_description = (field_id) => {
        if (field_id in this.state.payload.schema_ext.field_descriptions) {
            return this.state.payload.schema_ext.field_descriptions[field_id];
        }
        return "";
    };

    is_array_eq = (a, b) => {
        if (a.length != b.length) {
            return false;
        }
        for (const i in a) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    };

    is_fields_unique = (fields) => {
        const sorted_fields = [...fields].sort();
        for (const flds of this.state.payload.schema_ext.unique) {
            if (this.is_array_eq(sorted_fields, flds)) {
                return true;
            }
        }
        return false;
    };

    add_unique_fields = (state, fields) => {
        const sorted_fields = [...fields].sort();
        state.payload.schema_ext.unique.push(sorted_fields);
    };

    remove_unique_fields = (state, fields) => {
        const sorted_fields = [...fields].sort();
        state.payload.schema_ext.unique = _.reject(
            state.payload.schema_ext.unique,
            flds => this.is_array_eq(sorted_fields, flds)
        );
    };

    renderBody = () => {
        const {schema, schema_ext, mode} = this.state.payload;
        const render_description = (payload) => {
            return (
                <Form.Control
                    size="sm"
                    type="input"
                    value={this.get_field_description(payload.id)}
                    disabled={this.state.payload.mode=="view"}
                    onChange={(event) => {
                        const v = event.target.value;
                        this.setState(
                            state => {
                                this.state.payload.schema_ext.field_descriptions[payload.id] = v;
                                return state;
                            }
                        )
                    }}
                />
            );
        };
        const render_pk = (payload) => {
            return (
                <Form.Check
                    type="radio"
                    checked={this.state.payload.schema_ext.pk === payload.id}
                    disabled={this.state.payload.mode=="view"}
                    onChange={(event) => {
                        const checked = event.target.checked;
                        this.setState(
                            state => {
                                state.payload.schema_ext.pk = checked?payload.id:null;
                                return state;
                            }
                        )
                    }}
                />
            );
        };
        const render_unique = (payload) => {
            return (
                <Form.Check
                    type="checkbox"
                    checked={this.is_fields_unique([payload.id])}
                    disabled={this.state.payload.mode=="view"}
                    onChange={(event) => {
                        const checked = event.target.checked;
                        this.setState(
                            state => {
                                if (checked) {
                                    this.add_unique_fields(state, [payload.id]);
                                } else {
                                    this.remove_unique_fields(state, [payload.id]);
                                }
                                return state;
                            }
                        )
                    }}
                />
            );
        };

        const render_is_array = payload => payload.is_array && <Icon.Check />;
        const render_nullable = payload => payload.nullable && <Icon.Check />;

        const columns = {
            name:       {display: "Field Name"},
            type:       {display: "Type"},
            is_array:   {display: "Array", render_data: render_is_array},
            nullable:   {display: "Nullable", render_data: render_nullable},
            pk:         {display: "PK", render_data: render_pk},
            is_unique:  {display: "Unique", render_data: render_unique},
            description:{display: "Description", render_data: render_description},
        };
        const nodes=[];
        for (const field of schema.fields) {
            nodes.push(this.field_to_node(field, ''))
        }

        return (
            <div>
                <TreeTable
                    className="dataset-schema-table"
                    columns={columns}
                    nodes={nodes}
                />
            </div>
        );
    }
}
