import $ from 'jquery';

import React from 'react'
import ReactDOM from 'react-dom'

import Container from 'react-bootstrap/Container'
import Button from 'react-bootstrap/Button'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'


import {PipelineViewer} from '/components/business/pipeline/pipeline_viewer.jsx'
import {PipelineEditor} from '/components/business/pipeline/pipeline_editor.jsx'
import {PageHeader} from '/components/generic/page_tools'

import {get_csrf_token, get_app_context, get_current_user, pipeline_from_django_model} from '/common_lib'
import {savePipeline, pausePipeline, unpausePipeline} from '/apis'

const _ = require("lodash");

/*********************************************************************************
 * Purpose: Page to view an application
 *
 * Props
 *      pipeline : the pipeline to view
 *      current_user: the user who is viewing
 */
class PipelinePage extends React.Component {
    thePipelineEditorRef = React.createRef();

    savePipelineAndRefresh = (mode, pipeline) => {
        return savePipeline(get_csrf_token(), mode, pipeline).then(() => {
            location.reload();
        });
    };

    pausePipelineAndRefresh = (pipeline_id) => {
        return pausePipeline(get_csrf_token(), pipeline_id).then(() => {
            location.reload();
        });
    };

    unpausePipelineAndRefresh = (pipeline_id) => {
        return unpausePipeline(get_csrf_token(), pipeline_id).then(() => {
            location.reload();
        });
    };

    render() {
        return (
            <Container fluid>
                <Row>
                    <Col>
                        <PageHeader title="Pipeline">
                            {!!this.props.current_user &&
                                <Button
                                    className="ml-2"
                                    variant="secondary"
                                    size="sm"
                                    onClick={event => {
                                        this.thePipelineEditorRef.current.openDialog(
                                            "edit",
                                            pipeline_from_django_model(this.props.pipeline)
                                        );
                                    }}
                                >
                                    Edit
                                </Button>
                            }
                            <Button
                                className="ml-2"
                                variant="secondary"
                                size="sm"
                                onClick={event => {
                                    if (this.props.pipeline.paused) {
                                        this.unpausePipelineAndRefresh(this.props.pipeline.id);
                                    } else {
                                        this.pausePipelineAndRefresh(this.props.pipeline.id);
                                    }
                                }}
                            >
                                {this.props.pipeline.paused?"Unpause":"Pause"}
                            </Button>
                        </PageHeader>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <PipelineViewer
                            pipeline={this.props.pipeline}
                            applications_by_id={this.props.applications_by_id}
                        />
                    </Col>
                </Row>

                <PipelineEditor
                    ref={this.thePipelineEditorRef}
                    onSave={this.savePipelineAndRefresh}
                    applications={this.props.active_applications}
                />
            </Container>
        );
    }
}

$(function() {
    // app_context.applications is all application related to this pipeline
    // app_context.active_applications is all application user can use pipeline
    const current_user = get_current_user()
    const app_context = get_app_context();
    const applications_by_id = _.keyBy(app_context.applications, "id");


    ReactDOM.render(
        <PipelinePage
            current_user={current_user}
            pipeline={app_context.pipeline}
            applications_by_id={applications_by_id}
            active_applications={app_context.active_applications}
        />,
        document.getElementById('app')
    );
});
