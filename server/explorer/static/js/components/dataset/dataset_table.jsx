import React from 'react'

import Button from 'react-bootstrap/Button'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Table from 'react-bootstrap/Table'
import Form from 'react-bootstrap/Form'
import * as Icon from 'react-bootstrap-icons'

import {DatasetEditor} from './dataset_editor.jsx'
import {SchemaViewer} from './schema_viewer.jsx'

/*********************************************************************************
 * Purpose: Show list of datasets
 * TODO: pagination
 *
 * Props
 *     datasets             : a list of datasets
 *     allowEdit            : if True, user is allowed to edit dataset.
 *     allowNew             : if True, user is allowed to create new dataset
 *     onSave               : a callback, called with user want to save or edit
 *                            a dataset. onSave(mode, dataset) is called,
 *                            mode is either "new" or "edit"
 *     showExpired          : should check the "Show Expired Datasets" or not?
 *     onShowExpiredChange  : a callback, called when user change the "Show Expired Datasets"
 *
 */
export class DatasetTable extends React.Component {
    theDatasetEditorRef = React.createRef();
    theSchemaViewerRef  = React.createRef();

    get_schema = dataset => {
        if (!dataset.schema) {
            return null;
        }
        const schema_str = dataset.schema.trim();
        if (!schema_str) {
            return null;
        }
        return JSON.parse(schema_str);
    };

    render() {
        return (
            <div>
                <Row>
                    <Col>
                        <h1 className="c-ib">Datasets</h1>
                        <div className="c-vc c-ib">
                            {
                                this.props.allowNew && <Button
                                    size="sm"
                                    className="ml-2"
                                    onClick={() => {
                                        this.theDatasetEditorRef.current.openDialog("new");
                                    }}
                                >
                                    Create
                                </Button>
                            }
                            <Form.Check type="checkbox" label="Show Expired Datasets"
                                inline
                                className="ml-2"
                                checked={this.props.showExpired}
                                onChange={(event) => {
                                    this.props.onShowExpiredChange(event.target.checked);
                                }}
                            />
                        </div>
                    </Col>
                </Row>
                <Table hover className="dataset-table">
                    <thead className="thead-dark">
                        <tr>
                            <th className="c-tc-icon1"></th>
                            <th data-role='name'>Name</th>
                            <th data-role='schema'>Schema</th>
                            <th data-role='author'>Author</th>
                            <th data-role='team'>Team</th>
                            <th data-role='publish_time'>Published</th>
                            <th data-role='expired_time'>Expired</th>
                            <th data-role='major_version'>Major Version</th>
                            <th data-role='minor_version'>Minor Version</th>
                        </tr>
                    </thead>
                    <tbody>
                    {
                        this.props.datasets.map((dataset) => {
                            return (
                                <tr key={dataset.id}>
                                    <td  className="align-middle">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={event => {
                                                this.theDatasetEditorRef.current.openDialog(
                                                    this.props.allowEdit?"edit":"view", dataset
                                                )
                                            }}
                                        >
                                            { this.props.allowEdit?<Icon.Pencil />:<Icon.Info />}
                                        </Button>
                                    </td>
                                    <td><a href={`dataset?id=${dataset.id}`}>{dataset.name}</a></td>
                                    <td>
                                        {
                                            this.get_schema(dataset) &&
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={event => {
                                                    this.theSchemaViewerRef.current.openDialog(
                                                        this.get_schema(dataset)
                                                    )
                                                }}
                                            >
                                                <Icon.Info />
                                            </Button>
                                        }
                                    </td>
                                    <td>{dataset.author}</td>
                                    <td>{dataset.team}</td>
                                    <td>{dataset.publish_time}</td>
                                    <td>{dataset.expiration_time}</td>
                                    <td>{dataset.major_version}</td>
                                    <td>{dataset.minor_version}</td>
                                </tr>
                            )
                        })
                    }
                    </tbody>
                </Table>
                <DatasetEditor
                    ref={this.theDatasetEditorRef}
                    onSave={this.props.onSave}
                />
                <SchemaViewer
                    ref={this.theSchemaViewerRef}
                />
            </div>
        )
    }
}

