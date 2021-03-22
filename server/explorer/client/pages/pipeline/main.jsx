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

import {get_csrf_token, get_app_context, get_app_config, get_current_user, pipeline_from_django_model} from '/common_lib'
import {savePipeline, pausePipeline, unpausePipeline, retirePipeline} from '/apis'

const _ = require("lodash");

/*********************************************************************************
 * Purpose: Page to view an application
 *
 * Props
 *      pipeline : the pipeline to view
 *      current_user: the user who is viewing
 *      dag_svg: the svg string for the dag
 *      airflow_base_url: base url for airflow
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

    retirePipelineAndRefresh = (pipeline_id) => {
        return retirePipeline(get_csrf_token(), pipeline_id).then(() => {
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
                                        this.thePipelineEditorRef.current.openDialog({
                                            mode: "edit",
                                            pipeline: pipeline_from_django_model(this.props.pipeline)
                                        });
                                    }}
                                >
                                    Edit
                                </Button>
                            }
                            {!!this.props.current_user &&
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
                            }
                            {!!this.props.current_user && !this.props.pipeline.retired &&
                                <Button
                                    className="ml-2"
                                    variant="secondary"
                                    size="sm"
                                    onClick={event => {
                                        this.retirePipelineAndRefresh(this.props.pipeline.id);
                                    }}
                                >
                                    Retire
                                </Button>
                            }
                        </PageHeader>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <PipelineViewer
                            pipeline={this.props.pipeline}
                            applications_by_id={this.props.applications_by_id}
                            dag_svg = {this.props.dag_svg}
                            airflow_base_url = {this.props.airflow_base_url}
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
    const dag_svg = app_context.dag_svg;
    const app_config = get_app_config();

    ReactDOM.render(
        <PipelinePage
            current_user={current_user}
            pipeline={app_context.pipeline}
            applications_by_id={applications_by_id}
            active_applications={app_context.active_applications}
            dag_svg = {dag_svg}
            airflow_base_url = {app_config.AIRFLOW_BASE_URL}
        />,
        document.getElementById('app')
    );
});
