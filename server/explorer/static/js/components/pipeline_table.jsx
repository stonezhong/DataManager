/*****************************************************
 * Showing a table of pipelines
 * arguments
 * pipelines:
 *      An array of pipeline
 * TODO:
 *      Add pagination for large amount of pipelines
 ****************************************************/

import React from 'react'

import Table from 'react-bootstrap/Table'
import Button from 'react-bootstrap/Button'
import * as Icon from 'react-bootstrap-icons'
import Spinner from 'react-bootstrap/Spinner'

import {get_app_config} from '../common_lib'

/*************************************************************************
 * props
 *     editPipeline:    a callback to launch dialogbox to edit a pipeline
 *     pipelines   :    array of pipelines
 *     allowEdit   :    do we allow user to edit any pipeline?
 *     onPause     :    user want to pause a pipeline, calling onPause(pipeline_id)
 *     onUnpause   :    user want to unpause a pipeline, calling onUnpause(pipeline_id)
 */
export class PipelineTable extends React.Component {
    render() {
        return (
            <Table hover>
                <thead className="thead-dark">
                    <tr>
                        <th className="c-tc-icon1"></th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Airflow DAG</th>
                        <th>Author</th>
                        <th>Team</th>
                        <th>Category</th>
                        <th>Paused</th>
                    </tr>
                </thead>
                <tbody>
                {
                    this.props.pipelines.map((pipeline) => {
                        const app_config = get_app_config();
                        const AIRFLOW_BASE_URL = app_config.AIRFLOW_BASE_URL;
                        return (
                            <tr key={pipeline.id}>
                                <td  className="align-middle">
                                    <Button
                                        disabled = {!this.props.allowEdit}
                                        variant="secondary"
                                        size="sm"
                                        onClick={event => {
                                            this.props.editPipeline(pipeline);
                                        }}
                                    >
                                        <Icon.Pencil />
                                    </Button>
                                </td>
                                <td  className="align-middle"><a href={`pipeline?id=${pipeline.id}`}>{pipeline.name}</a></td>
                                <td  className="align-middle">{pipeline.type}</td>
                                <td  className="align-middle">
                                    <a
                                        href={`${AIRFLOW_BASE_URL}/admin/airflow/graph?dag_id=${pipeline.name}&execution_date=`}
                                        className={(pipeline.dag_version > 0)?"d-inline":"d-none"}
                                    >
                                        <img src="/static/images/airflow.jpeg" style={{height: "24px"}}/>
                                    </a>
                                    {
                                        (() => {
                                            if (pipeline.dag_version < pipeline.version) {
                                                return (<Spinner animation="border" size="sm" className="ml-2"/>);
                                            }
                                        })()
                                    }
                                </td>
                                <td  className="align-middle">{pipeline.author}</td>
                                <td  className="align-middle">{pipeline.team}</td>
                                <td  className="align-middle">{pipeline.category}</td>
                                <td  className="align-middle">
                                    {pipeline.paused?"Yes":"No"}
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="ml-2"
                                        onClick={event => {
                                            if (pipeline.paused) {
                                                this.props.onUnpause(pipeline.id);
                                            } else {
                                                this.props.onPause(pipeline.id);
                                            }
                                        }}
                                    >
                                        {pipeline.paused?"Unpause":"Pause"}
                                    </Button>
                                </td>
                            </tr>
                        )
                    })
                }
                </tbody>
            </Table>
        );
    }
}
