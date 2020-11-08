import React from 'react'

import Table from 'react-bootstrap/Table'

/*********************************************************************************
 * Purpose: Show list of pipeline instances
 * TODO: pagination
 *
 * Props
 *     pipeline_instances : a list of pipeline instances
 *     get_dag_url        : a callback, given a pipeline instance, it returns a URL point to the airflow DAG
 *     get_dag_run_url    : a callback, given a pipeline instance, it returns a URL point to the airflow DAG run
 *
 */
export class PipelineInstanceTable extends React.Component {
    render() {
        return (
            <Table hover>
                <thead className="thead-dark">
                    <tr>
                        <th>Pipeline</th>
                        <th>Airflow</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                {
                    this.props.pipeline_instances.map((pipeline_instance) => {
                        return (
                            <tr key={pipeline_instance.id}>
                                <td><a href={`pipeline?id=${pipeline_instance.pipeline.id}`}>{pipeline_instance.pipeline.name}</a></td>
                                <td>
                                    { this.props.get_dag_url(pipeline_instance)}
                                    { " | " }
                                    { this.props.get_dag_run_url(pipeline_instance) }
                                </td>
                                <td>{pipeline_instance.status}</td>
                            </tr>
                        )
                    })
                }
                </tbody>
            </Table>
        )
    }
}
