import React from 'react'

import './pipeline.scss'

const _ = require("lodash");

/*************************************************************************
 * props
 *     pipeline         : the pipeline object
 *     airflow_base_url : string
 *     className        : string, optional
 *
 */
export class AirflowDAGLink extends React.Component {
    render() {
        const pipeline_id = _.replace(this.props.pipeline.id, /-/g, '');
        const dag_id = `${this.props.pipeline.name}.${pipeline_id}`;
        const q = `dag_id=${encodeURIComponent(dag_id)}`;

        const extraOps = {};
        if ('className' in this.props) {
            extraOps.className = this.props.className;
        }

        return (
            <a
                {...extraOps}
                href={`${this.props.airflow_base_url}/tree?${q}`}
            >
                <img src="/static/images/airflow.png" className="icon24" />
            </a>
        );
    }
}

/*************************************************************************
 * props
 *     pipeline_instace : the pipeline instance object
 *     execution_date   : string, like "2020-12-09+03:03:32+00:00"
 *     airflow_base_url : string
 *
 */
export class AirflowDAGRunLink extends React.Component {
    render() {
        if (this.props.pipeline_instance.status === 'created') {
            return null;
        }
        const context = JSON.parse(this.props.pipeline_instance.context);
        const run_id = context.dag_run.execution_date;
        const pipeline_id = _.replace(this.props.pipeline_instance.pipeline.id, /-/g, '');
        const dag_id = `${this.props.pipeline_instance.pipeline.name}.${pipeline_id}`;
        const q = `dag_id=${encodeURIComponent(dag_id)}&execution_date=${encodeURIComponent(run_id)}`

        const extraOps = {};
        if ('className' in this.props) {
            extraOps.className = this.props.className;
        }

        return (
            <a
                {...extraOps}
                href={`${this.props.airflow_base_url}/graph?${q}`}
            >
                <img src="/static/images/airflow-dagrun.ico" className="icon24" />
            </a>
        );
    }
}
