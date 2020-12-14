/*****************************************************
 * Showing a table of pipelines
 * arguments
 * pipelines:
 *      An array of pipeline
 * TODO:
 *      Add pagination for large amount of pipelines
 ****************************************************/

import React from 'react'

import Spinner from 'react-bootstrap/Spinner'

import {DataTable} from '/components/generic/datatable/main.jsx'

import {AirflowDAGLink} from '/components/business/pipeline/airflow.jsx'
import {PipelineLink} from '/components/business/pipeline/pipeline_link.jsx'
import {AppIcon} from '/components/generic/icons/main.jsx'

import {
    pipeline_from_django_model,
} from '/common_lib'

import './pipeline.scss'

const _ = require("lodash");

/*************************************************************************
 * props
 *     applications     : list of all applications available. (needed when create pipline using app)
 *     get_page         : A function to get the page
 *     airflow_base_url : the base url for airflow
 *
 */
export class PipelineTable extends React.Component {
    theDataTableRef      = React.createRef();

    render_type = pipeline => pipeline_from_django_model(pipeline).type;

    render_airflow_dag = pipeline => {
        const pipeline2 = pipeline_from_django_model(pipeline);
        const pipeline_id = _.replace(pipeline.id, /-/g, '');
        return (
            <div>
                {
                    (pipeline.dag_version > 0) &&
                    <AirflowDAGLink
                        airflow_base_url={this.props.airflow_base_url}
                        pipeline = {pipeline}
                    />
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
                <AppIcon type={pipeline2.paused?"dismiss":"checkmark"} className="icon16"/>
                <span className="ml-2">{pipeline2.paused?"Paused":""}</span>
            </div>
        );
    };

    render_name = pipeline => <PipelineLink pipeline={pipeline} />

    get_page = (offset, limit) => {
        return this.props.get_page(
            offset, limit
        );
    };

    refresh = () => this.theDataTableRef.current.refresh();
    reset   = () => this.theDataTableRef.current.reset();

    columns = {
        name:               {display: "Name", render_data: this.render_name},
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
            </div>
        );
    }
}
