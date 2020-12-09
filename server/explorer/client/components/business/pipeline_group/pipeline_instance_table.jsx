import React from 'react'

import Table from 'react-bootstrap/Table'

import {AirflowDAGLink, AirflowDAGRunLink} from '/components/business/pipeline/airflow.jsx'

import './pipeline_group.scss'

/*********************************************************************************
 * Purpose: Show list of pipeline instances
 * TODO: pagination
 *
 * Props
 *     pipeline_instances : a list of pipeline instances
 *     airflow_base_url   : airflow base url, string
 *
 */
export class PipelineInstanceTable extends React.Component {
    render() {
        return (
            <Table hover bordered size="sm" className="pipeline-instance-table">
                <thead className="thead-dark">
                    <tr>
                        <th data-role='name'>Pipeline</th>
                        <th data-role='airflow'>Airflow</th>
                        <th data-role='status'>Status</th>
                    </tr>
                </thead>
                <tbody>
                {
                    this.props.pipeline_instances.map((pipeline_instance) => {
                        return (
                            <tr key={pipeline_instance.id}>
                                <td data-role='name'>
                                    <a href={`pipeline?id=${pipeline_instance.pipeline.id}`}>{pipeline_instance.pipeline.name}</a>
                                </td>
                                <td data-role='airflow'>
                                    <AirflowDAGLink
                                        airflow_base_url = {this.props.airflow_base_url}
                                        pipeline = { pipeline_instance.pipeline }
                                    />
                                    <AirflowDAGRunLink
                                        className="ml-2"
                                        airflow_base_url = {this.props.airflow_base_url}
                                        pipeline_instance = { pipeline_instance }
                                    />
                                </td>
                                <td data-role='status'>
                                    {pipeline_instance.status}
                                </td>
                            </tr>
                        )
                    })
                }
                </tbody>
            </Table>
        )
    }
}
