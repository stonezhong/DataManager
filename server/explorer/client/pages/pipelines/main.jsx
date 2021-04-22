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
    get_csrf_token, get_app_context, get_current_user, get_app_config, get_tenant_id, handle_json_response
} from '/common_lib'

import {savePipeline} from '/apis'
import { getPipelines } from '../../apis';

const buildUrl = require('build-url');


class PipelinesPage extends React.Component {
    thePipelineEditorRef    = React.createRef();
    thePipelineTableRef     = React.createRef();

    onSave = (mode, pipeline) => {
        return savePipeline(
            get_csrf_token(),
            this.props.tenant_id,
            mode,
            pipeline
        ).then(this.thePipelineTableRef.current.refresh);
    };

    get_page = (offset, limit, filter={}) => {
        return getPipelines(this.props.tenant_id, offset, limit);
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
                                        this.thePipelineEditorRef.current.openDialog({
                                            mode: "new"
                                        });
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
                            tenant_id={this.props.tenant_id}
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
    const current_user = get_current_user();
    const app_context = get_app_context();
    const app_config = get_app_config();
    const tenant_id = get_tenant_id();

    ReactDOM.render(
        <PipelinesPage
            current_user={current_user}
            tenant_id={tenant_id}
            applications={app_context.applications}
            airflow_base_url = {app_config.AIRFLOW_BASE_URL}
        />,
        document.getElementById('app')
    );
});
