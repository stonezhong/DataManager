/*****************************************************
 * Showing a table of pipelines
 * arguments
 * pipelines:
 *      An array of pipeline
 * TODO:
 *      Add pagination for large amount of pipelines
 ****************************************************/

import React from 'react'

import Button from 'react-bootstrap/Button'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Table from 'react-bootstrap/Table'
import * as Icon from 'react-bootstrap-icons'
import Spinner from 'react-bootstrap/Spinner'

import {PipelineEditor} from './pipeline_editor.jsx'
import {DataTable} from '/components/generic/datatable/main.jsx'

import {
    pipeline_from_django_model,
} from '/common_lib'

import './pipeline.scss'

/*************************************************************************
 * props
 *     applications:    list of all applications available. (needed when create pipline using app)
 *     get_page    :    A function to get the page
 *     allowEdit   :    if True, user is allowed to edit pipeline.
 *     allowNew    :    if True, user is allowed to create new pipeline
 *     onSave      :    a callback, called with user want to save or edit
 *                      a pipeline. onSave(mode, pipeline) is called,
 *     onPause     :    onPause(pipeline_id) is called with user want to pause a pipeline
 *     onUnpause   :    onUnpause(pipeline_id) is called with user want to unpause a pipeline
 * airflow_base_url:    the base url for airflow
 *
 */
export class PipelineTable extends React.Component {
    thePipelineEditorRef = React.createRef();
    theDataTableRef      = React.createRef();

    render_tools = pipeline =>
        <Button
            variant="secondary"
            size="sm"
            variant="secondary"
            onClick={event => {
                this.thePipelineEditorRef.current.openDialog(
                    this.props.allowEdit?"edit":"view",
                    pipeline_from_django_model(pipeline)
                );
            }}
        >
            { this.props.allowEdit?<Icon.Pencil />:<Icon.Info />}
        </Button>;

    render_type = pipeline => pipeline_from_django_model(pipeline).type;

    render_airflow_dag = pipeline => {
        const pipeline2 = pipeline_from_django_model(pipeline);
        return (
            <div>
                {
                    (pipeline.dag_version > 0) &&
                    <a
                        href={`${this.props.airflow_base_url}/admin/airflow/graph?dag_id=${pipeline2.name}&execution_date=`}
                    >
                        <img src="/static/images/airflow.jpeg" style={{height: "24px"}}/>
                    </a>
                }
                {
                    (pipeline.dag_version < pipeline.version) &&
                    <Spinner animation="border" size="sm" className="ml-2"/>
                }
            </div>
        );
    };

    render_paused = pipeline => {
        const pipeline2 = pipeline_from_django_model(pipeline);
        return (
            <div>
                {
                    <img
                        src={pipeline2.paused?"/static/images/x-mark-32.ico":"/static/images/checkmark-32.ico"}
                        className="icon24"
                    />
                }
                {
                    this.props.allowEdit &&
                    <Button
                        variant="secondary"
                        size="sm"
                        className="ml-2"
                        onClick={event => {
                            if (pipeline2.paused) {
                                this.onUnpause(pipeline2.id);
                            } else {
                                this.onPause(pipeline2.id);
                            }
                        }}
                    >
                        {pipeline2.paused?"Activate":"Pause"}
                    </Button>
                }
            </div>
        );
    };

    onPause = pipeline_id => {
        this.props.onPause(
            pipeline_id
        ).then(this.theDataTableRef.current.refresh)
    };

    onUnpause = pipeline_id => {
        this.props.onUnpause(
            pipeline_id
        ).then(this.theDataTableRef.current.refresh);
    };

    onSave = (mode, pipeline) => {
        this.props.onSave(mode, pipeline).then(this.theDataTableRef.current.refresh);
    };

    get_page = (offset, limit) => {
        return this.props.get_page(
            offset, limit
        );
    };

    columns = {
        tools:              {display: "", render_data: this.render_tools},
        name:               {display: "Name"},
        type:               {display: "Type", render_data: this.render_type},
        airflow_dag:        {display: "Airflow DAG", render_data: this.render_airflow_dag},
        author:             {display: "Author"},
        team:               {display: "Team"},
        category:           {display: "Category"},
        paused:             {display: "Active", render_data: this.render_paused},
    };

    render() {
        return (
            <div>
                <Row>
                    <Col>
                        <h1 className="c-ib">Pipelines</h1>
                        {
                            this.props.allowNew && <Button
                                size="sm"
                                className="c-vc ml-2"
                                onClick={() => {
                                    this.thePipelineEditorRef.current.openDialog("new");
                                }}
                            >
                                Create
                            </Button>
                        }
                    </Col>
                </Row>

                <DataTable
                    ref={this.theDataTableRef}
                    hover
                    bordered
                    className="pipeline-table"
                    columns = {this.columns}
                    id_column = "id"
                    size = {this.props.size}
                    page_size={this.props.page_size}
                    fast_step_count={10}
                    get_page={this.get_page}
                />

                <PipelineEditor
                    ref={this.thePipelineEditorRef}
                    onSave={this.onSave}
                    applications={this.props.applications}
                />

            </div>
        );
    }
}
