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

    columns = {
        tools:          {display: ""},
        name:           {display: "Name"},
        schema:         {display: "Schema", render_data: row => null},
        author:         {display: "Author"},
        team:           {display: "Team"},
        published:      {display: "Published"},
        expired:        {display: "Expired"},
        major_version:  {display: "Major Version"},
        minor_version:  {display: "Minor Version"},
    };

    state = {
        showExpired: this.props.initShowExpired
    }


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
                                    this.setState({showExpired: event.target.checked})
                                }}
                            />
                        </div>
                    </Col>
                </Row>
                <DataTable
                    hover
                    bordered
                    className="dataset-table"
                    columns = {this.columns}
                    id_column = "id"
                    size = {this.props.size}
                    page_size={this.props.page_size}
                    fast_step_count={10}
                    get_page={this.props.get_page}
                />

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

