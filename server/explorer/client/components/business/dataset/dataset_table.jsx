import React from 'react';

import Button from 'react-bootstrap/Button';
import * as Icon from 'react-bootstrap-icons';

import {DataTable} from '/components/generic/datatable/main.jsx';
import {DatasetLink} from '/components/business/dataset/utils.jsx';
import {SimpleDialogBox} from '/components/generic/dialogbox/simple.jsx';
import {DatasetSample, has_sample_data} from '/components/business/dataset/dataset_sample.jsx';
import {SchemaEditor, has_schema} from '/components/business/dataset/schema_editor.jsx';

import './dataset.scss';

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
 *     showExpired          : boolean, shall we display expired dataset?
 *
 */
export class DatasetTable extends React.Component {
    theSchemaEditorRef  = React.createRef();
    theDataTableRef     = React.createRef();
    theSampleViewRef    = React.createRef();

    render_schema = dataset => {
        return (
            has_schema(dataset) &&
            <Button
                variant="secondary"
                size="sm"
                onClick={
                    event => {
                        this.theSchemaEditorRef.current.openDialog({
                            mode: "view",
                            dataset: dataset
                        });
                    }
                }
            >
                <Icon.Info />
            </Button>
        );
    };

    render_sample_data = dataset => {
        return (
            has_sample_data(dataset) &&
            <Button
                variant="secondary"
                size="sm"
                onClick={
                    event => {
                        this.theSampleViewRef.current.openDialog(
                            "Sample Data",
                            <DatasetSample dataset={dataset} />
                        )
                    }
                }
            >
                <Icon.Info />
            </Button>
        );
    };

    render_name = dataset => <a href={`/explorer/${this.props.tenant_id}/dataset?id=${dataset.id}`}>{dataset.name}</a>;

    get_page = (offset, limit) => {
        return this.props.get_page(offset, limit, {showExpired: this.props.showExpired});
    };

    refresh = () => this.theDataTableRef.current.refresh();
    reset   = () => this.theDataTableRef.current.reset();

    columns = {
        name:               {display: "Name", render_data: this.render_name},
        schema:             {display: "Schema", render_data: this.render_schema},
        sample:             {display: "Sample Data", render_data: this.render_sample_data},
        author:             {display: "Author"},
        team:               {display: "Team"},
        publish_time:       {display: "Published"},
        expiration_time:    {display: "Expired"},
        major_version:      {display: "Major Version"},
        minor_version:      {display: "Minor Version"},
    };


    render() {
        return (
            <div>
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

                <SchemaEditor
                    ref={this.theSchemaEditorRef}
                    onSave={this.saveDatasetSchemaExtAndRefresh}
                />

                <SimpleDialogBox
                    ref={this.theSampleViewRef}
                    dialogClassName="md-modal"
                />
            </div>
        )
    }
}

