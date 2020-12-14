import $ from 'jquery';

import React from 'react'
import ReactDOM from 'react-dom'

import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Container from 'react-bootstrap/Container'
import Button from 'react-bootstrap/Button'

import {PipelineTable} from '/components/business/pipeline/pipeline_table.jsx'
import {PipelineEditor} from '/components/business/pipeline/pipeline_editor.jsx'
import {PageHeader} from '/components/generic/page_tools'

import {
    get_csrf_token, get_app_context, get_current_user, get_app_config, handle_json_response
} from '/common_lib'

import {savePipeline} from '/apis'

const buildUrl = require('build-url');


class PipelinesPage extends React.Component {
    thePipelineEditorRef    = React.createRef();
    thePipelineTableRef     = React.createRef();

    onSave = (mode, pipeline) => {
        return savePipeline(
            get_csrf_token(), mode, pipeline
        ).then(this.thePipelineTableRef.current.refresh);
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
                <Row>
                    <Col>
                        <PageHeader title="Pipelines">
                            {
                                !!this.props.current_user && <Button
                                    size="sm"
                                    className="ml-2"
                                    onClick={() => {
                                        this.thePipelineEditorRef.current.openDialog(
                                            "new"
                                        );
                                    }}
                                >
                                    Create
                                </Button>
                            }
                        </PageHeader>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <PipelineTable
                            ref={this.thePipelineTableRef}
                            applications={this.props.applications}
                            airflow_base_url={this.props.airflow_base_url}
                            get_page={this.get_page}
                            page_size={15}
                            size="sm"
                        />
                    </Col>
                </Row>
                <PipelineEditor
                    ref={this.thePipelineEditorRef}
                    onSave={this.onSave}
                    applications={this.props.applications}
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
