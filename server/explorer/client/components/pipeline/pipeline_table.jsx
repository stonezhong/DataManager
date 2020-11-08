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

/*************************************************************************
 * props
 *     pipelines   :    a list of pipelines
 *     applications:    list of all applications available. (needed when create pipline using app)
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
                            return (
                                <tr key={pipeline.id}>
                                    <td  className="align-middle">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            variant="secondary"
                                            onClick={event => {
                                                this.thePipelineEditorRef.current.openDialog(
                                                    this.props.allowEdit?"edit":"view",
                                                    pipeline
                                                );
                                            }}
                                        >
                                            { this.props.allowEdit?<Icon.Pencil />:<Icon.Info />}
                                        </Button>
                                    </td>
                                    <td  className="align-middle"><a href={`pipeline?id=${pipeline.id}`}>{pipeline.name}</a></td>
                                    <td  className="align-middle">{pipeline.type}</td>
                                    <td  className="align-middle">
                                        <a
                                            href={`${this.props.airflow_base_url}/admin/airflow/graph?dag_id=${pipeline.name}&execution_date=`}
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
                                        {
                                            this.props.allowEdit &&
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
                                        }
                                    </td>
                                </tr>
                            )
                        })
                    }
                    </tbody>
                </Table>
                <PipelineEditor
                    ref={this.thePipelineEditorRef}
                    onSave={this.props.onSave}
                    applications={this.props.applications}
                />

            </div>
        );
    }
}
