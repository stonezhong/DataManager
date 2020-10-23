import React from 'react'
import ReactDOM from 'react-dom'
import $ from 'jquery'

import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Table from 'react-bootstrap/Table'
import Container from 'react-bootstrap/Container'

import {get_csrf_token, get_app_context, get_app_config, get_current_user} from '/common_lib'
import {PipelineGroupEditor} from '/components/pipeline_group/pipeline_group_editor.jsx'
import {PipelineSelector} from '/components/pipeline/pipeline_selector.jsx'

const _ = require("lodash");

class PipelineGroup extends React.Component {
    state = {
        pipeline_group: null
    };

    load_pipeline_group = () => {
        fetch(`/api/PipelineGroups/${this.props.pipeline_group_id}/details/`)
            .then(res => res.json())
            .then(
                (result) => {
                    this.setState(
                        state => {
                            state.pipeline_group = result;
                            return state;
                        },
                        () => {
                            setTimeout(this.load_pipeline_group, 2000)
                        }
                    );
                }
            )
    };

    componentDidMount() {
        this.load_pipeline_group();
    }

    thePipelineGroupEditorRef = React.createRef();
    thePipelineSelectorRef    = React.createRef();

    get pipeline_instances() {
        return this.state.pipeline_group.pis;
    }

    get_dag_run_url = (pipeline_instance, app_config) => {
        if (pipeline_instance.status === 'created') {
            return null;
        }
        // either started, finished or failed
        const AIRFLOW_BASE_URL = app_config.AIRFLOW_BASE_URL;
        const context = JSON.parse(pipeline_instance.context);

        const run_id = context.dag_run.execution_date;
        const dag_id = pipeline_instance.pipeline.name;
        const q = `dag_id=${encodeURIComponent(dag_id)}&execution_date=${encodeURIComponent(run_id)}`

        return (
            <a href={`${AIRFLOW_BASE_URL}/admin/airflow/graph?${q}`}>Run</a>
        );
    };

    get_dag_url = (pipeline_instance, app_config) => {
        const AIRFLOW_BASE_URL = app_config.AIRFLOW_BASE_URL;
        const context = JSON.parse(pipeline_instance.context);
        const dag_id = pipeline_instance.pipeline.name;
        const q = `dag_id=${encodeURIComponent(dag_id)}`

        return (
            <a href={`${AIRFLOW_BASE_URL}/admin/airflow/tree?${q}`}>DAG</a>
        );
    };

    openDiagForAttach = (event) => {
        fetch("/api/Pipelines/active/")
        .then(res => res.json())
        .then(
            (result) => {
                // remove pipeline instance already exist
                const pipeline_ids = new Set(this.state.pipeline_group.pis.map(pi => pi.pipeline.id));
                const pipelines = result.filter(r => !pipeline_ids.has(r.id))

                this.thePipelineSelectorRef.current.openDialog(
                    pipelines
                );
            }
        )
    };

    onAttach = pipeline_ids => {
        const to_post = {
            pipeline_ids: pipeline_ids
        }
        fetch(
            `/api/PipelineGroups/${this.props.pipeline_group_id}/attach/`,
            {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': get_csrf_token(),
                },
                body: JSON.stringify(to_post)
            }
        )
        .then(res => res.json())
        .then(
            (result) => {
                // no need to reload
            }
        )
    };

    render() {
        return (
            <div>
                <Container fluid>
                    <Row>
                        <Col>
                            <h1 className="c-ib">Execution</h1>
                            <div className="c-vc c-ib ml-2">
                                {
                                    this.state.pipeline_group && <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={event => {
                                            this.thePipelineGroupEditorRef.current.openDialog(
                                                "edit",
                                                this.state.pipeline_group
                                            );
                                        }}
                                    >
                                        Edit
                                    </Button>
                                }
                                <Button
                                    variant="primary"
                                    size="sm"
                                    className="ml-2"
                                    onClick={this.openDiagForAttach}
                                >
                                    Attach
                                </Button>
                            </div>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <h2>{this.state.pipeline_group?this.state.pipeline_group.name:""}</h2>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <Table hover>
                                <thead className="thead-dark">
                                    <tr>
                                        <th>Pipeline</th>
                                        <th>Airflow</th>
                                        <th>Status</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                {
                                    this.state.pipeline_group && this.pipeline_instances.map((pipeline_instance) => {
                                        const app_config = get_app_config();
                                        const AIRFLOW_BASE_URL = app_config.AIRFLOW_BASE_URL;
                                        const context = JSON.parse(pipeline_instance.context);
                                        return (
                                            <tr key={pipeline_instance.id}>
                                                <td><a href={`pipeline?id=${pipeline_instance.pipeline.id}`}>{pipeline_instance.pipeline.name}</a></td>
                                                <td>
                                                    { this.get_dag_url(pipeline_instance, app_config)}
                                                    { " | " }
                                                    { this.get_dag_run_url(pipeline_instance, app_config) }
                                                </td>
                                                <td>{pipeline_instance.status}</td>
                                            </tr>
                                        )
                                    })
                                }
                                </tbody>
                            </Table>
                        </Col>
                    </Row>
                </Container>
                <PipelineGroupEditor
                    ref={this.thePipelineGroupEditorRef}
                />
                <PipelineSelector
                    ref={this.thePipelineSelectorRef}
                    onSelect={this.onAttach}
                />
            </div>
        )
    }
}

$(function() {
    const current_user = get_current_user()
    const app_context = get_app_context();

    ReactDOM.render(
        <PipelineGroup
            current_user={current_user}
            pipeline_group_id={app_context.pipeline_group_id}
        />,
        document.getElementById('app')
    );
});
