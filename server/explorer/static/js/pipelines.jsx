import $ from 'jquery';

import React from 'react'
import ReactDOM from 'react-dom'

import Button from 'react-bootstrap/Button'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Container from 'react-bootstrap/Container'

import {PipelineTable} from './components/pipeline_table.jsx'
import {PipelineEditor} from './components/pipeline_editor.jsx'
import {get_csrf_token, pipeline_to_django_model, pipeline_from_django_model, get_app_context} from './common_lib'

class Pipelines extends React.Component {
    state = {
        pipelines: [],
    };

    constructor(props) {
        super();
        this.thePipelineEditorRef = React.createRef();
    }

    load_pipelines = () =>  {
        fetch("/api/Pipelines/")
        .then(res => res.json())
        .then(
            (result) => {
                this.setState(
                    {pipelines: result},
                    () => {
                        setTimeout(this.load_pipelines, 2000)
                    }
                );
            }
        )
    }

    onPausePipeline = (pipeline_id) => {
        fetch(`/api/Pipelines/${pipeline_id}/`, {
            method: 'patch',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': get_csrf_token(),
            },
            body: JSON.stringify({paused: true})
        })
            .then((res) => res.json())
            .then(
                (result) => {
                    // No need to call load_pipelines, it will refresh every 2 seconds
                    // this.load_pipelines();
                }
            )
    }

    onUnpausePipeline = (pipeline_id) => {
        fetch(`/api/Pipelines/${pipeline_id}/`, {
            method: 'patch',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': get_csrf_token(),
            },
            body: JSON.stringify({paused: false})
        })
            .then((res) => res.json())
            .then(
                (result) => {
                    // No need to call load_pipelines, it will refresh every 2 seconds
                    // this.load_pipelines();
                }
            )
    }

    componentDidMount() {
        this.load_pipelines();
    }

    // called when PipelineEditor saved a pipeline in memory
    onPipelineSaved = (mode, pipeline) => {
        const to_post = pipeline_to_django_model(pipeline);
        if (mode == "new") {
            fetch('/api/Pipelines/', {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': get_csrf_token(),
                },
                body: JSON.stringify(to_post)
            })
                .then((res) => res.json())
                .then(
                    (pipeline_created) => {
                        if (pipeline.type == 'external') {
                            // no need to create airflow DAG
                            // No need to call load_pipelines, it will refresh every 2 seconds
                            // this.load_pipelines();
                } else {
                            // this is sequential
                            // we will create DAG
                            fetch(`/api/Pipelines/${pipeline_created.id}/create_dag/`, {
                                method: 'post',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-CSRFToken': get_csrf_token(),
                                },
                            })
                                .then(res => res.json())
                                .then(
                                    (result) => {
                                        // No need to call load_pipelines, it will refresh every 2 seconds
                                        // this.load_pipelines();
                                    }
                                )
                        }
                    }
                )
        } else {
            // we are editing an existing pipeline
            fetch(`/api/Pipelines/${pipeline.id}/`, {
                method: 'put',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': get_csrf_token(),
                },
                body: JSON.stringify(to_post)
            })
                .then((res) => res.json())
                .then(
                    (result) => {
                        // pipeline has changed, reload
                        // No need to call load_pipelines, it will refresh every 2 seconds
                        // this.load_pipelines();
                        // TODO: need to have an API to touch the dag file
                        //       so airflow can load the DAG file again
                    }
                )
        }
    };

    render() {
        return (
            <div>
                <Container fluid>
                    <Row>
                        <Col>
                            <h1 className="c-ib">Pipelines</h1>
                            <Button
                                disabled = {this.props.username == ''}
                                size="sm"
                                className="c-vc ml-2"
                                onClick={() => {
                                    this.thePipelineEditorRef.current.openDialog();
                                }}
                            >
                                Create
                            </Button>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <PipelineTable
                                pipelines={this.state.pipelines.map(pipeline_from_django_model)}
                                allowEdit = {this.props.username != ''}
                                onPause = {this.onPausePipeline}
                                onUnpause = {this.onUnpausePipeline}
                                editPipeline={
                                    pipeline => {
                                        this.thePipelineEditorRef.current.openDialog(pipeline);
                                    }
                                }
                            />
                        </Col>
                    </Row>
                </Container>
                <PipelineEditor
                    ref={this.thePipelineEditorRef}
                    onSave={this.onPipelineSaved}
                    applications={this.props.applications}
                />
            </div>
        );
    }
}

$(function() {
    const username = document.getElementById('app').getAttribute("data-username");
    const app_context = get_app_context();

    ReactDOM.render(
        <Pipelines
            username={username}
            applications={app_context.applications}
        />,
        document.getElementById('app')
    );
});
