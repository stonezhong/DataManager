import React from 'react'

import Button from 'react-bootstrap/Button'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Table from 'react-bootstrap/Table'
import Form from 'react-bootstrap/Form'
import * as Icon from 'react-bootstrap-icons'

import {DatasetEditor} from './dataset_editor.jsx'
import {SchemaViewer} from './schema_viewer.jsx'
import {DataTable} from '/components/generic/datatable/main.jsx'

import './dataset.scss'

/*********************************************************************************
 * Purpose: Show list of datasets
 *
 * Props
 *     get_page             : A function to get the page
 *                            get_page(offset, limit, filter={}),
 *                            offset start from 0
 *                            limit is the max number of model returned
 *                            it returns like below:
 *                            {
 *                                count: 120,
 *                                results: [
 *                                    dataset1,
 *                                    dataset2,
 *                                    ...
 *                                ]
 *                            }
 *
 *     allowEdit            : if True, user is allowed to edit dataset.
 *     allowNew             : if True, user is allowed to create new dataset
 *     initShowExpired      : init value of showExpired, user can change it
 *     onSave               : a callback, called with user want to save or edit
 *                            a dataset. onSave(mode, dataset) is called,
 *                            mode is either "new" or "edit"
 *
 */
export class DatasetTable extends React.Component {
    theDatasetEditorRef = React.createRef();
    theSchemaViewerRef  = React.createRef();
    theDataTableRef     = React.createRef();

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

    render_schema = dataset => {
        return (
            this.get_schema(dataset) &&
            <Button
                variant="secondary"
                size="sm"
                onClick={
                    event => {
                        this.theSchemaViewerRef.current.openDialog(
                            this.get_schema(dataset)
                        )
                    }
                }
            >
                <Icon.Info />
            </Button>
        );
    };

    render_tools = dataset =>
        <Button
            variant="secondary"
            size="sm"
            onClick={
                event => {
                    this.theDatasetEditorRef.current.openDialog(
                        this.props.allowEdit?"edit":"view", dataset
                    )
                }
            }
        >
            { this.props.allowEdit?<Icon.Pencil />:<Icon.Info />}
        </Button>;

    render_name = dataset =>
        <a href={`dataset?id=${dataset.id}`}>{dataset.name}</a>
    ;

    get_page = (offset, limit) => {
        return this.props.get_page(offset, limit, {showExpired: this.state.showExpired});
    };

    columns = {
        tools:              {display: "", render_data: this.render_tools},
        name:               {display: "Name", render_data: this.render_name},
        schema:             {display: "Schema", render_data: this.render_schema},
        author:             {display: "Author"},
        team:               {display: "Team"},
        publish_time:       {display: "Published"},
        expiration_time:    {display: "Expired"},
        major_version:      {display: "Major Version"},
        minor_version:      {display: "Minor Version"},
    };

    state = {
        showExpired: this.props.initShowExpired
    }

    onSave = (mode, dataset) => {
        return this.props.onSave(mode, dataset).then(this.theDataTableRef.current.refresh);
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
                                checked={this.state.showExpired}
                                onChange={(event) => {
                                    this.setState(
                                        {showExpired: event.target.checked},
                                        this.theDataTableRef.current.reset
                                    )
                                }}
                            />
                        </div>
                    </Col>
                </Row>
                <DataTable
                    ref={this.theDataTableRef}
                    hover
                    bordered
                    className="dataset-table"
                    columns = {this.columns}
                    id_column = "id"
                    size = {this.props.size}
                    page_size={this.props.page_size}
                    fast_step_count={10}
                    get_page={this.get_page}
                />

                <DatasetEditor
                    ref={this.theDatasetEditorRef}
                    onSave={this.onSave}
                />
                <SchemaViewer
                    ref={this.theSchemaViewerRef}
                />
            </div>
        )
    }
}

