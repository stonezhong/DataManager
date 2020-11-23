import React from 'react'
import ReactDOM from 'react-dom'
import $ from 'jquery'

import Button from 'react-bootstrap/Button'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Container from 'react-bootstrap/Container'

import {get_csrf_token, get_app_context, get_app_config, get_current_user} from '/common_lib'
import {PipelineGroupEditor} from '/components/business/pipeline_group/pipeline_group_editor.jsx'
import {PipelineSelector} from '/components/business/pipeline/pipeline_selector.jsx'
import {PipelineInstanceTable} from '/components/business/pipeline_group/pipeline_instance_table.jsx'

const _ = require("lodash");

class PipelineGroupPage extends React.Component {
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

    get_dag_run_url = (pipeline_instance) => {
        if (pipeline_instance.status === 'created') {
            return null;
        }
        // either started, finished or failed
        const AIRFLOW_BASE_URL = this.props.app_config.AIRFLOW_BASE_URL;
        const context = JSON.parse(pipeline_instance.context);

        const run_id = context.dag_run.execution_date;
        const dag_id = pipeline_instance.pipeline.name;
        const q = `dag_id=${encodeURIComponent(dag_id)}&execution_date=${encodeURIComponent(run_id)}`

        return (
            <a href={`${AIRFLOW_BASE_URL}/admin/airflow/graph?${q}`}>Run</a>
        );
    };

    get_dag_url = (pipeline_instance) => {
        const AIRFLOW_BASE_URL = this.props.app_config.AIRFLOW_BASE_URL;
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

    showEdit = () => {
        // on show Edit button and Attach button for pipeline group manually created
        // and not yet finished
        if (!this.state.pipeline_group) {
            return false;
        }
        return this.state.pipeline_group.manual && !this.state.pipeline_group.finished;
    };

    render() {
        return (
            <div>
                <Container fluid>
                    {
                        this.state.pipeline_group && <div>
                            <Row>
                                <Col>
                                    <h1 className="c-ib">Execution - {this.state.pipeline_group.name}</h1>
                                    {
                                        this.showEdit() &&
                                        <div className="c-vc c-ib ml-2">
                                            <Button
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
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                className="ml-2"
                                                onClick={this.openDiagForAttach}
                                            >
                                                Attach
                                            </Button>
                                        </div>
                                    }
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <PipelineInstanceTable
                                        pipeline_instances = {this.state.pipeline_group.pis}
                                        get_dag_url = {this.get_dag_url}
                                        get_dag_run_url = {this.get_dag_run_url}
                                    />
                                </Col>
                            </Row>
                        </div>
                    }
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
    const app_config = get_app_config();

    ReactDOM.render(
        <PipelineGroupPage
            app_config = {app_config}
            current_user={current_user}
            pipeline_group_id={app_context.pipeline_group_id}
        />,
        document.getElementById('app')
    );
});
