import $ from 'jquery';

import React from 'react'
import ReactDOM from 'react-dom'

import Container from 'react-bootstrap/Container'

import {PipelineTable} from '/components/pipeline/pipeline_table.jsx'
import {
    get_csrf_token, pipeline_to_django_model, pipeline_from_django_model,
    get_app_context, get_current_user, get_app_config
} from '/common_lib'

class PipelinesPage extends React.Component {
    state = {
        pipelines: [],
    };


    load_pipelines = () =>  {
        fetch("/api/Pipelines/")
        .then(res => res.json())
        .then(
            (result) => {
                this.setState(
                    {pipelines: result.map(pipeline => pipeline_from_django_model(pipeline))},
                    () => {
                        setTimeout(this.load_pipelines, 2000)
                    }
                );
            }
        )
    }

    onPause = (pipeline_id) => {
        // called when user want to pause a pipeline
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

    onUnpause = (pipeline_id) => {
        // called when user want to unpause a pipeline
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
    onSave = (mode, pipeline) => {
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
            <Container fluid>
                <PipelineTable
                    allowEdit={!!this.props.current_user}
                    allowNew={!!this.props.current_user}
                    pipelines={this.state.pipelines}
                    applications={this.props.applications}
                    onPause={this.onPause}
                    onUnpause={this.onUnpause}
                    onSave={this.onSave}
                    airflow_base_url={this.props.airflow_base_url}
                />
            </Container>
        );
    }
}

$(function() {
    const current_user = get_current_user()
    const app_context = get_app_context();
    const app_config = get_app_config();

    ReactDOM.render(
        <PipelinesPage
            current_user={current_user}
            applications={app_context.applications}
            airflow_base_url = {app_config.AIRFLOW_BASE_URL}
        />,
        document.getElementById('app')
    );
});
