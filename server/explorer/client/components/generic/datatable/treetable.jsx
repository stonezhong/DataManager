import React from 'react';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';

const _ = require("lodash");


/*********************************************************************************
 * Purpose: Generic Tree Table
 *
 * Props
 *     className: string. The css class name.
 *     columns:
 *         key is the column name, should be unique.
 *         value is a dict, display is the display name for the column, showed in column
 *         header, render_data is a function, proto is render_data(payload), it should
 *         return a component you wish to display, render_data is optional, if missing,
 *         the value for the column in payload will be displayed.
 *
 *     nodes: array of object. The nodes that need to be rendered
 *            Each node has an "id" field, which is globally unique
 *            Each node has a "payload" field, which contains the payload of the node
 *            Each node has a "children" field, which contains children
 *
 *     !! No pagination support, this is designed to display table with small amount of data only.
 *
 */

export class TreeTable extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            expand: {}
        };
        this.build_rows();
    }

    build_rows() {
        const rows = [];
        for (const node of this.props.nodes) {
            this.append_tree_node_to_row(node, 0, -1, rows);
        }
        this.rows = rows;
    }

    append_tree_node_to_row = (node, depth, parent_idx, rows) => {
        const row = {};

        row.idx = rows.length;          // row is at the end of rows
        row.depth = depth;
        row.parent_idx = parent_idx;
        row.id = node.id;               // node.id should be unique cross all nodes
        row.payload = _.cloneDeep(node.payload);
        rows.push(row);

        const children = node.children || [];
        row.child_count = children.length;

        for (const child of children) {
            this.append_tree_node_to_row(child, depth + 1,  row.idx, rows);
        }
    };

    // if any parent of the row is not expanded, then this node should hide
    should_show = (row) => {
        var cur = row;
        for (;;) {
            if (cur.depth === 0) {
                return true
            }
            if (!this.state.expand[cur.parent_idx]) {
                return false;
            }
            cur = this.rows[cur.parent_idx];
        }
    };

    toggle_expand = (row) => {
        this.setState(state => {
            state.expand[row.idx] = !state.expand[row.idx];
            return state;
        });
    };

    render_data = (row, column_name, column_def) => {
        const render_function = column_def.render_data;
        if (_.isUndefined(render_function)) {
            return row.payload[column_name];
        }

        return render_function(row.payload);
    };


    render() {
        const expandable_column_name = Object.keys(this.props.columns)[0];

        return (
            <Table hover size="sm" className={this.props.className}>
                <thead className="thead-dark">
                    <tr>
                        <th className="c-tc-icon1"></th>
                        {
                            _.map(this.props.columns,  (column_def, column_name) => {
                                return (
                                    <th key={`column-header-${column_name}`} data-role={column_name}>{column_def.display}</th>
                                );
                            })
                        }
                    </tr>
                </thead>
                <tbody>
                    {
                        this.rows.map(row => {
                            if (!this.should_show(row)) {
                                return null;
                            }
                            return (
                                <tr key={row.id}>
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
                                    {
                                        _.map(this.props.columns, (column_def, column_name) => {
                                            if (column_name === expandable_column_name) {
                                                return (
                                                    <td
                                                        key={`column-header-${column_name}`}
                                                        style={{paddingLeft: `${40*row.depth}px`}}
                                                    >
                                                        { this.render_data(row, column_name, column_def)}
                                                    </td>
                                                );
                                            } else {
                                                return (
                                                    <td key={`column-header-${column_name}`}>
                                                        { this.render_data(row, column_name, column_def)}
                                                    </td>
                                                );
                                            }
                                        })
                                    }
                                </tr>
                            );
                        })
                    }
                </tbody>
            </Table>
        );
    }
}
