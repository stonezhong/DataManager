import React from 'react'

import Button from 'react-bootstrap/Button'
import Table from 'react-bootstrap/Table'
import * as Icon from 'react-bootstrap-icons'

import './dataset.scss'

const _ = require("lodash");

export function get_schema(dataset) {
    if (!dataset) {
        return null;
    }
    if (!dataset.schema) {
        return null;
    }
    const schema_str = dataset.schema.trim();
    if (!schema_str) {
        return null;
    }
    try {
        return JSON.parse(schema_str);
    }
    catch (e) {
        // console.log(`get_schema: bad json, ${schema_str}`);
        return null;
    }

}

/*********************************************************************************
 * Purpose: View a Dataset Schema
 *
 * Props
 *     dataset   : a dataset object
 *
 */

export class SchemaViewer extends React.Component {
    state = {
        expand: {},
    };

    get_field = (field) => {
        const data = {
        };
        const children = [];
        const ret = {
            data: data,
        }
        data.name = field.name;

        var fields = []
        if (_.isString(field.type)) {
            data.type = field.type;
            data.is_array = false;
            data.nullable = field.nullable;
            if (data.type === "struct") {
                fields = field.fields;
            }
        } else {
            if (field.type.type === "array") {
                const altField = field.type.elementType;
                data.type = altField.type;
                data.is_array = true;
                data.nullable = field.nullable;
                if (altField.type === 'struct') {
                    fields = altField.fields;
                }
            } else if (field.type.type === "struct") {
                data.type = "struct";
                data.is_array = false;
                data.nullable = field.nullable;
                fields = field.type.fields;
            } else {
                // won't handle
            }
        }

        ret.children = fields.map(subField => this.get_field(subField));
        return ret;
    };

    append_tree_node_to_row = (tn, depth, row) => {
        // tn's data is in data field
        // tn's children contains all child nodes
        // we can safely to inject other fields
        tn.idx = row.length;
        tn.depth = depth;
        row.push(tn);

        const children = tn.children;
        delete tn.children;
        if (!children) {
            tn.child_count = 0;
            return;
        }

        tn.child_count = children.length;
        for (const i in children) {
            children[i].parentIdx = tn.idx;
        }

        for (const i in children) {
            this.append_tree_node_to_row(children[i], depth + 1, row);
        }
    };

    debug = () => {
        const view_data = this.state.schema.fields.map(fld => this.get_field(fld));
        const rows = [];
        for (const i in view_data) {
            this.append_tree_node_to_row(view_data[i], 0, rows);
        }
    };

    toggle_expand = (row) => {
        this.setState(state => {
            state.expand[row.idx] = !state.expand[row.idx];
            return state;
        });
    };

    get_table_rows = () => {
        const schema = get_schema(this.props.dataset);
        if (!schema) {
            return null;
        }

        const view_data = schema.fields.map(fld => this.get_field(fld));
        const rows = [];
        for (const i in view_data) {
            this.append_tree_node_to_row(view_data[i], 0, rows);
        }

        return rows.map(row => {
            return (
                this.should_show(row, rows) &&
                <tr key={row.idx}>
                    <td>
                        {
                            (row.child_count > 0) &&
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {this.toggle_expand(row)}}
                            >
                                {
                                    this.state.expand[row.idx] ? "-" : "+"
                                }
                            </Button>
                        }

                    </td>
                    <td
                        style={{paddingLeft: `${40*row.depth}px`}}
                    >
                        {row.data.name}
                    </td>
                    <td>{row.data.type}</td>
                    <td>
                        {row.data.is_array && <Icon.Check />}
                    </td>
                    <td>
                        {row.data.nullable && <Icon.Check />}
                    </td>
                </tr>
            );
        });
    };

    should_show = (row, rows) => {
        var cur = row;
        for (;;) {
            if (cur.depth === 0) {
                return true
            }
            if (!this.state.expand[cur.parentIdx]) {
                return false;
            }
            cur = rows[cur.parentIdx];
        }
    };

    render() {
        return (
            <Table hover size="sm" className="dataset-schema-table">
                <thead className="thead-dark">
                    <tr>
                        <th className="c-tc-icon1"></th>
                        <th data-role='name'>Field Name</th>
                        <th data-role='type'>Type</th>
                        <th data-role='is_array'>Array</th>
                        <th data-role='nullable'>Nullable</th>
                    </tr>
                </thead>
                <tbody>
                    { this.get_table_rows() }
                </tbody>
            </Table>
        );
    }
}
