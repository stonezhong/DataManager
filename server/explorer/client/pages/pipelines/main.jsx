import $ from 'jquery';
const buildUrl = require('build-url');

import React from 'react'
import ReactDOM from 'react-dom'

import Container from 'react-bootstrap/Container'

import {PipelineTable} from '/components/business/pipeline/pipeline_table.jsx'
import {
    get_csrf_token, pipeline_to_django_model, pipeline_from_django_model,
    get_app_context, get_current_user, get_app_config, handle_json_response
} from '/common_lib'

class PipelinesPage extends React.Component {
    state = {
        pipelines: [],
    };

    onPause = (pipeline_id) => {
        // called when user want to pause a pipeline
        return fetch(`/api/Pipelines/${pipeline_id}/`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': get_csrf_token(),
                'X-Data-Manager-Use-Method': 'PATCH',
            },
            body: JSON.stringify({paused: true})
        }).then(handle_json_response)
    }

    onUnpause = (pipeline_id) => {
        // called when user want to unpause a pipeline
        return fetch(`/api/Pipelines/${pipeline_id}/`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': get_csrf_token(),
                'X-Data-Manager-Use-Method': 'PATCH',
            },
            body: JSON.stringify({paused: false})
        }).then(handle_json_response)
    }

    // called when PipelineEditor saved a pipeline in memory
    onSave = (mode, pipeline) => {
        const to_post = pipeline_to_django_model(pipeline);
        if (mode == "new") {
            return fetch('/api/Pipelines/', {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': get_csrf_token(),
                },
                body: JSON.stringify(to_post)
            })
                .then(handle_json_response)
                .then(
                    pipeline_created => {
                        if (pipeline.type == 'external') {
                            return ;
                        } else {
                            // this is sequential
                            // we will create DAG
                            return fetch(`/api/Pipelines/${pipeline_created.id}/create_dag/`, {
                                method: 'post',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-CSRFToken': get_csrf_token(),
                                },
                            }).then(handle_json_response);
                        }
                    }
                )
        } else {
            // we are editing an existing pipeline
            return fetch(`/api/Pipelines/${pipeline.id}/`, {
                method: 'put',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': get_csrf_token(),
                },
                body: JSON.stringify(to_post)
            }).then(handle_json_response);
        }
    };

    get_page = (offset, limit, filter={}) => {
        const buildArgs = {
            path: "/api/Pipelines/",
            queryParams: {
                offset: offset,
                limit : limit,
            }
        };
        const url = buildUrl('', buildArgs);
        return fetch(url).then(handle_json_response);
    };

    render() {
        return (
            <Container fluid>
                <PipelineTable
                    allowEdit={!!this.props.current_user}
                    allowNew={!!this.props.current_user}
                    applications={this.props.applications}
                    onPause={this.onPause}
                    onUnpause={this.onUnpause}
                    onSave={this.onSave}
                    airflow_base_url={this.props.airflow_base_url}
                    get_page={this.get_page}
                    page_size={15}
                    size="sm"
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
