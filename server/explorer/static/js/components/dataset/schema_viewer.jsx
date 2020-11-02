import React from 'react'

import Button from 'react-bootstrap/Button'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import Table from 'react-bootstrap/Table'
import * as Icon from 'react-bootstrap-icons'

const _ = require("lodash");

/*********************************************************************************
 * Purpose: View a Dataset Schema
 *
 * Props
 *     schema   : schema from spark dataframe, it is generated from
 *                df.schema.jsonValue
 *
 */

export class SchemaViewer extends React.Component {
    state = {
        show: false,
        schema: null,
        expand: {},
    };


    openDialog = (schema) => {
        this.setState({
            show: true,
            schema: schema
        })
    };

    onClose = () => {
        this.setState({show: false});
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
        console.log(this.state.schema);
        const view_data = this.state.schema.fields.map(fld => this.get_field(fld));
        console.log(view_data);
        const rows = [];
        for (const i in view_data) {
            this.append_tree_node_to_row(view_data[i], 0, rows);
        }
        console.log(rows);
    };

    toggle_expand = (row) => {
        this.setState(state => {
            state.expand[row.idx] = !state.expand[row.idx];
            return state;
        });
    };

    get_table_rows = () => {
        if (!this.state.schema) {
            return null;
        }

        const view_data = this.state.schema.fields.map(fld => this.get_field(fld));
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
            <Modal
                show={this.state.show}
                onHide={this.onClose}
                backdrop="static"
                size='lg'
                scrollable
            >
                <Modal.Header closeButton>
                    <Modal.Title>Schema</Modal.Title>
                </Modal.Header>
                <Modal.Body>
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
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={this.onClose}>Close</Button>
                </Modal.Footer>
            </Modal>
        );
    }
}
